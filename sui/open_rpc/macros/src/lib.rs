// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use proc_macro::TokenStream;

use derive_syn_parse::Parse;
use itertools::Itertools;
use proc_macro2::{Ident, TokenTree};
use proc_macro2::{Span, TokenStream as TokenStream2};
use quote::quote;
use syn::punctuated::Punctuated;
use syn::spanned::Spanned;
use syn::token::Paren;
use syn::{
    parse, parse_macro_input, Attribute, GenericArgument, LitStr, PatType, Path, PathArguments,
    Token, TraitItem, Type,
};

#[proc_macro_attribute]
/// Add a <service name>OpenRpc struct and implementation providing access to Open RPC doc builder.
/// This proc macro must be use in conjunction with `jsonrpsee_proc_macro::rpc`
///
/// The generated method `open_rpc` is added to <service name>OpenRpc,
/// ideally we want to add this to the trait generated by jsonrpsee framework, creating a new struct
/// to provide access to the method is a workaround.
///
/// TODO: consider contributing the open rpc doc macro to jsonrpsee to simplify the logics.
pub fn open_rpc(attr: TokenStream, item: TokenStream) -> TokenStream {
    let attr: OpenRpcAttributes = parse_macro_input!(attr);

    let mut trait_data: syn::ItemTrait = syn::parse(item).unwrap();
    let rpc_definition = parse_rpc_method(&mut trait_data).unwrap();
    let mut methods = Vec::new();
    for method in rpc_definition.methods {
        let name = method.name;
        let doc = method.doc;
        let mut inputs = Vec::new();
        for (name, ty) in method.params {
            let (ty, required) = extract_type_from_option(ty);
            inputs.push(quote! {
                let des = builder.create_content_descriptor::<#ty>(#name, "", "", #required);
                inputs.push(des);
            })
        }
        let returns_ty = if let Some(ty) = method.returns {
            let (ty, required) = extract_type_from_option(ty);
            let name = quote! {#ty}.to_string();
            quote! {Some(builder.create_content_descriptor::<#ty>(#name, "", "", #required));}
        } else {
            quote! {None;}
        };
        methods.push(quote! {
            let mut inputs: Vec<sui_open_rpc::ContentDescriptor> = Vec::new();
            #(#inputs)*
            let result = #returns_ty
            builder.add_method(#name, inputs, result, #doc);
        })
    }
    let open_rpc_name = quote::format_ident!("{}OpenRpc", &rpc_definition.name);

    let url = attr.find_attr("license_url").to_quote();

    let license = attr
        .find_attr("license")
        .unwrap_quote(|license| quote! (builder.set_license(#license, #url);));

    let contact_url = attr.find_attr("contact_url").to_quote();
    let contact_email = attr.find_attr("contact_email").to_quote();
    let contact = attr.find_attr("contact_name").unwrap_quote(
        |contact| quote! (builder.set_contact(#contact, #contact_url, #contact_email);),
    );
    let description = attr
        .find_attr("description")
        .unwrap_quote(|description| quote! (builder.set_description(#description);));

    let proj_name = attr
        .find_attr("name")
        .map(|str| str.value())
        .unwrap_or_default();
    let namespace = attr
        .find_attr("namespace")
        .map(|str| str.value())
        .unwrap_or_default();

    quote! {
        #trait_data
        pub struct #open_rpc_name;
        impl #open_rpc_name {
            pub fn open_rpc() -> sui_open_rpc::Project{
                let mut builder = sui_open_rpc::ProjectBuilder::new(#proj_name, #namespace);
                #license
                #contact
                #description
                #(#methods)*
                builder.build()
            }
        }
    }
    .into()
}

trait OptionalQuote {
    fn to_quote(&self) -> TokenStream2;

    fn unwrap_quote<F>(&self, quote: F) -> TokenStream2
    where
        F: FnOnce(LitStr) -> TokenStream2;
}

impl OptionalQuote for Option<LitStr> {
    fn to_quote(&self) -> TokenStream2 {
        if let Some(value) = self {
            quote!(Some(#value.to_string()))
        } else {
            quote!(None)
        }
    }

    fn unwrap_quote<F>(&self, quote: F) -> TokenStream2
    where
        F: FnOnce(LitStr) -> TokenStream2,
    {
        if let Some(lit_str) = self {
            quote(lit_str.clone())
        } else {
            quote!()
        }
    }
}

struct RpcDefinition {
    name: Ident,
    methods: Vec<Method>,
}
struct Method {
    name: String,
    params: Vec<(String, Type)>,
    returns: Option<Type>,
    doc: String,
}

fn parse_rpc_method(trait_data: &mut syn::ItemTrait) -> Result<RpcDefinition, syn::Error> {
    let mut methods = Vec::new();
    for trait_item in &mut trait_data.items {
        if let TraitItem::Method(method) = trait_item {
            let method_name = if let Some(attr) = find_attr(&method.attrs, "method").cloned() {
                let token: TokenStream = attr.tokens.clone().into();
                parse::<NamedAttribute>(token)?.value.value()
            } else {
                "Unknown method name".to_string()
            };

            let doc = extract_doc_comments(&method.attrs).to_string();

            let params: Vec<_> = method
                .sig
                .inputs
                .iter_mut()
                .filter_map(|arg| match arg {
                    syn::FnArg::Receiver(_) => None,
                    syn::FnArg::Typed(arg) => match *arg.pat.clone() {
                        syn::Pat::Ident(name) => {
                            Some(get_type(arg).map(|ty| (name.ident.to_string(), ty)))
                        }
                        syn::Pat::Wild(wild) => Some(Err(syn::Error::new(
                            wild.underscore_token.span(),
                            "Method argument names must be valid Rust identifiers; got `_` instead",
                        ))),
                        _ => Some(Err(syn::Error::new(
                            arg.span(),
                            format!("Unexpected method signature input; got {:?} ", *arg.pat),
                        ))),
                    },
                })
                .collect::<Result<_, _>>()?;

            let returns = match &method.sig.output {
                syn::ReturnType::Default => None,
                syn::ReturnType::Type(_, output) => extract_type_from(&*output, "RpcResult"),
            };
            methods.push(Method {
                name: method_name,
                params,
                returns,
                doc,
            });
        }
    }
    Ok(RpcDefinition {
        name: trait_data.ident.clone(),
        methods,
    })
}

fn extract_type_from(ty: &Type, from_ty: &str) -> Option<Type> {
    fn path_is(path: &Path, from_ty: &str) -> bool {
        path.leading_colon.is_none()
            && path.segments.len() == 1
            && path.segments.iter().next().unwrap().ident == from_ty
    }

    if let Type::Path(p) = ty {
        if p.qself.is_none() && path_is(&p.path, from_ty) {
            if let PathArguments::AngleBracketed(a) = &p.path.segments[0].arguments {
                if let Some(GenericArgument::Type(ty)) = a.args.first() {
                    return Some(ty.clone());
                }
            }
        }
    }
    None
}

fn extract_type_from_option(ty: Type) -> (Type, bool) {
    if let Some(ty) = extract_type_from(&ty, "Option") {
        (ty, false)
    } else {
        (ty, true)
    }
}

fn get_type(pat_type: &mut PatType) -> Result<Type, syn::Error> {
    Ok(
        if let Some((pos, attr)) = pat_type
            .attrs
            .iter()
            .find_position(|a| a.path.is_ident("schemars"))
        {
            let attribute = parse::<NamedAttribute>(attr.tokens.clone().into())?;

            let stream = syn::parse_str(&attribute.value.value())?;
            let tokens = respan_token_stream(stream, attribute.value.span());

            let path = syn::parse2(tokens)?;
            pat_type.attrs.remove(pos);
            path
        } else {
            pat_type.ty.as_ref().clone()
        },
    )
}

fn find_attr<'a>(attrs: &'a [Attribute], ident: &str) -> Option<&'a Attribute> {
    attrs.iter().find(|a| a.path.is_ident(ident))
}

fn respan_token_stream(stream: TokenStream2, span: Span) -> TokenStream2 {
    stream
        .into_iter()
        .map(|mut token| {
            if let TokenTree::Group(g) = &mut token {
                *g = proc_macro2::Group::new(g.delimiter(), respan_token_stream(g.stream(), span));
            }
            token.set_span(span);
            token
        })
        .collect()
}

fn extract_doc_comments(attrs: &[syn::Attribute]) -> String {
    attrs
        .iter()
        .filter(|attr| {
            attr.path.is_ident("doc")
                && match attr.parse_meta() {
                    Ok(syn::Meta::NameValue(meta)) => matches!(&meta.lit, syn::Lit::Str(_)),
                    _ => false,
                }
        })
        .map(|attr| {
            let s = attr.tokens.to_string();
            s[4..s.len() - 1].to_string()
        })
        .join(" ")
}

#[derive(Parse, Debug)]
struct OpenRpcAttributes {
    #[parse_terminated(OpenRpcAttribute::parse)]
    fields: Punctuated<OpenRpcAttribute, Token![,]>,
}

impl OpenRpcAttributes {
    fn find_attr(&self, name: &str) -> Option<LitStr> {
        self.fields
            .iter()
            .find(|attr| attr.label == name)
            .map(|attr| attr.value.clone())
    }
}

#[derive(Parse, Debug)]
struct OpenRpcAttribute {
    label: syn::Ident,
    _eq_token: Token![=],
    value: syn::LitStr,
}

#[derive(Parse, Debug)]
struct NamedAttribute {
    #[paren]
    _paren_token: Paren,
    #[inside(_paren_token)]
    _ident: Ident,
    #[inside(_paren_token)]
    _eq_token: Token![=],
    #[inside(_paren_token)]
    value: syn::LitStr,
}
