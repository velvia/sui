// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use clap::Parser;
use jsonrpsee::{
    http_server::{AccessControlBuilder, HttpServerBuilder},
    RpcModule,
};
use std::{
    env,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};
use sui::{
    api::{RpcGatewayOpenRpc, RpcGatewayServer},
    config::sui_config_dir,
    sui_node::SuiNode,
};
use tracing::info;

const DEFAULT_NODE_SERVER_PORT: &str = "5002";
const DEFAULT_NODE_SERVER_ADDR_IPV4: &str = "127.0.0.1";

#[derive(Parser)]
#[clap(
    name = "Sui Node",
    about = "A Byzantine fault tolerant chain with low-latency finality and high throughput",
    rename_all = "kebab-case"
)]
struct SuiNodeOpt {
    #[clap(long)]
    config: Option<PathBuf>,

    #[clap(long, default_value = DEFAULT_NODE_SERVER_PORT)]
    port: u16,

    #[clap(long, default_value = DEFAULT_NODE_SERVER_ADDR_IPV4)]
    host: Ipv4Addr,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = telemetry_subscribers::TelemetryConfig {
        service_name: "sui_node".into(),
        enable_tracing: std::env::var("SUI_TRACING_ENABLE").is_ok(),
        json_log_output: std::env::var("SUI_JSON_SPAN_LOGS").is_ok(),
        ..Default::default()
    };
    #[allow(unused)]
    let guard = telemetry_subscribers::init(config);

    let options: SuiNodeOpt = SuiNodeOpt::parse();
    let config_path = options
        .config
        .unwrap_or(sui_config_dir()?.join("node.conf"));
    info!("Node config file path: {:?}", config_path);

    let server_builder = HttpServerBuilder::default();
    let mut ac_builder = AccessControlBuilder::default();

    if let Ok(value) = env::var("ACCESS_CONTROL_ALLOW_ORIGIN") {
        let list = value.split(',').collect::<Vec<_>>();
        info!("Setting ACCESS_CONTROL_ALLOW_ORIGIN to : {:?}", list);
        ac_builder = ac_builder.set_allowed_origins(list)?;
    }

    let acl = ac_builder.build();
    info!("{:?}", acl);

    let server = server_builder
        .set_access_control(acl)
        .build(SocketAddr::new(IpAddr::V4(options.host), options.port))
        .await?;

    let mut module = RpcModule::new(());
    let open_rpc = RpcGatewayOpenRpc::open_rpc();
    module.register_method("rpc.discover", move |_, _| Ok(open_rpc.clone()))?;
    module.merge(SuiNode::new(&config_path)?.into_rpc())?;

    info!(
        "Available JSON-RPC methods : {:?}",
        module.method_names().collect::<Vec<_>>()
    );

    let addr = server.local_addr()?;
    let server_handle = server.start(module)?;
    info!("Sui RPC Gateway listening on local_addr:{}", addr);

    server_handle.await;
    Ok(())
}
