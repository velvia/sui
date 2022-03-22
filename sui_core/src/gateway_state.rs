// Copyright (c) 2021, Facebook, Inc. and its affiliates
// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::authority::AuthorityTemporaryStore;
use crate::{transaction_input_checker, execution_engine};
use crate::{
    authority::GatewayStore, authority_aggregator::AuthorityAggregator,
    authority_client::AuthorityAPI,
};
use async_trait::async_trait;
use futures::future;

use itertools::Either;
use move_bytecode_utils::module_cache::ModuleCache;
use move_core_types::identifier::Identifier;
use move_core_types::language_storage::TypeTag;
use move_core_types::value::MoveStructLayout;
use move_vm_runtime::native_functions::NativeFunctionTable;
use sui_adapter::adapter;
use sui_types::MOVE_STDLIB_ADDRESS;
use sui_types::error::SuiResult;
use sui_types::object::ObjectFormatOptions;
use sui_types::{
    base_types::*,
    coin,
    committee::Committee,
    error::SuiError,
    fp_ensure,
    messages::*,
    object::{Object, ObjectRead},
    SUI_FRAMEWORK_ADDRESS,
};

use std::collections::HashMap;
use std::path::PathBuf;

use std::sync::Arc;
use std::time::Duration;
use std::{
    collections::{BTreeMap, BTreeSet},
};

use self::gateway_responses::*;

pub mod gateway_responses;

pub type AsyncResult<'a, T, E> = future::BoxFuture<'a, Result<T, E>>;

pub type GatewayClient = Box<dyn GatewayAPI + Sync + Send>;

pub struct GatewayState<A> {
    authorities: AuthorityAggregator<A>,
    store: Arc<GatewayStore>,

    /// Move native functions that are available to invoke
    native_functions: NativeFunctionTable,
    move_vm: Arc<adapter::MoveVM>,
}

impl<A> GatewayState<A> {
    /// Create a new manager which stores its managed addresses at `path`
    pub fn new(
        path: PathBuf,
        committee: Committee,
        authority_clients: BTreeMap<AuthorityName, A>,
    ) -> Self {
        let native_functions =
            sui_framework::natives::all_natives(MOVE_STDLIB_ADDRESS, SUI_FRAMEWORK_ADDRESS);

        Self {
            store: Arc::new(GatewayStore::open(path, None)),
            authorities: AuthorityAggregator::new(committee, authority_clients),
            native_functions,
            move_vm: adapter::new_move_vm(native_functions)
                .expect("We defined natives to not fail here"),
        }
    }

    #[cfg(test)]
    pub fn get_authorities(&self) -> &AuthorityAggregator<A> {
        &self.authorities
    }
}

// Operations are considered successful when they successfully reach a quorum of authorities.
#[async_trait]
pub trait GatewayAPI {
    async fn execute_transaction(
        &mut self,
        tx: Transaction,
    ) -> Result<TransactionResponse, anyhow::Error>;

    /// Send coin object to a Sui address.
    async fn transfer_coin(
        &mut self,
        signer: SuiAddress,
        object_id: ObjectID,
        gas_payment: ObjectID,
        recipient: SuiAddress,
    ) -> Result<TransactionData, anyhow::Error>;

    /// Synchronise account state with a random authorities, updates all object_ids and certificates
    /// from account_addr, request only goes out to one authority.
    /// this method doesn't guarantee data correctness, caller will have to handle potential byzantine authority
    async fn sync_account_state(&self, account_addr: SuiAddress) -> Result<(), anyhow::Error>;

    /// Call move functions in the module in the given package, with args supplied
    async fn move_call(
        &mut self,
        signer: SuiAddress,
        package_object_ref: ObjectRef,
        module: Identifier,
        function: Identifier,
        type_arguments: Vec<TypeTag>,
        gas_object_ref: ObjectRef,
        object_arguments: Vec<ObjectRef>,
        shared_object_arguments: Vec<ObjectID>,
        pure_arguments: Vec<Vec<u8>>,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error>;

    /// Publish Move modules
    async fn publish(
        &mut self,
        signer: SuiAddress,
        package_bytes: Vec<Vec<u8>>,
        gas_object_ref: ObjectRef,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error>;

    /// Split the coin object (identified by `coin_object_ref`) into
    /// multiple new coins. The amount of each new coin is specified in
    /// `split_amounts`. Remaining balance is kept in the original
    /// coin object.
    /// Note that the order of the new coins in SplitCoinResponse will
    /// not be the same as the order of `split_amounts`.
    async fn split_coin(
        &mut self,
        signer: SuiAddress,
        coin_object_id: ObjectID,
        split_amounts: Vec<u64>,
        gas_payment: ObjectID,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error>;

    /// Merge the `coin_to_merge` coin object into `primary_coin`.
    /// After this merge, the balance of `primary_coin` will become the
    /// sum of the two, while `coin_to_merge` will be deleted.
    ///
    /// Returns a pair:
    ///  (update primary coin object reference, updated gas payment object reference)
    ///
    /// TODO: Support merging a vector of coins.
    async fn merge_coins(
        &mut self,
        signer: SuiAddress,
        primary_coin: ObjectID,
        coin_to_merge: ObjectID,
        gas_payment: ObjectID,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error>;

    /// Get the object information
    async fn get_object_info(&self, object_id: ObjectID) -> Result<ObjectRead, anyhow::Error>;

    /// Get refs of all objects we own from local cache.
    fn get_owned_objects(&mut self, account_addr: SuiAddress) -> Vec<ObjectRef>;
}

impl<A> GatewayState<A>
where
    A: AuthorityAPI + Send + Sync + 'static + Clone,
{
    /// Download the object from all authorites.
    /// This is expensive and should be done only when necessary.
    async fn download_object_from_authorities(&self, object_id: ObjectID) -> Result<ObjectRead, anyhow::Error> {
        self.authorities.get_object_info_execute(object_id).await
    }

    pub async fn get_framework_object_ref(&mut self) -> Result<ObjectRef, anyhow::Error> {
        let info = self
            .get_object_info(ObjectID::from(SUI_FRAMEWORK_ADDRESS))
            .await?;
        Ok(info.reference()?)
    }

    async fn read_objects_from_store(
        &self,
        input_objects: &[InputObjectKind],
    ) -> SuiResult<Vec<Option<Object>>> {
        // TODO: For objects that are not in objects table,
        // should we read from the history table as well?
        let ids: Vec<_> = input_objects.iter().map(|kind| kind.object_id()).collect();
        let objects = self.store.get_objects(&ids[..])?;
        Ok(objects)
    }

    /// Execute (or retry) a transaction and execute the Confirmation Transaction.
    /// Update local object states using newly created certificate and ObjectInfoResponse from the Confirmation step.
    /// This functions locks all the input objects if possible, and unlocks at the end of confirmation or if an error occurs
    /// TODO: define other situations where we can unlock objects after authority error
    /// https://github.com/MystenLabs/sui/issues/346
    async fn execute_transaction_impl(
        &self,
        transaction: Transaction,
    ) -> Result<(CertifiedTransaction, TransactionEffects), anyhow::Error> {
        transaction.check_signature()?;
        let transaction_digest = transaction.digest();
        let input_objects = transaction.input_objects()?;
        let objects = self.read_objects_from_store(&input_objects).await?;

        let objects_by_kind =
            transaction_input_checker::check_locks(&transaction, input_objects, objects)?;
        let owned_objects = transaction_input_checker::filter_owned_objects(&objects_by_kind);
        let mut temporary_store =
            AuthorityTemporaryStore::new(self.store.clone(), &objects_by_kind, transaction_digest);
        let local_effects = execution_engine::execute_transaction_to_effects(
            &mut temporary_store,
            transaction.clone(),
            transaction_digest,
            objects_by_kind,
            &self.move_vm,
            self.native_functions.clone(),
        )?;
        self.store.set_transaction_lock(
            &owned_objects,
            transaction_digest,
            transaction.into(),
        )?;
        let (new_certificate, effects) = self.authorities.execute_transaction(&transaction).await?;
        debug_assert_eq!(local_effects, effects);
        // Update local data using new transaction response.
        let effects = self.store.update_state(temporary_store, &new_certificate, effects.into(), None)?;

        Ok((new_certificate, effects))
    }

    /// Fetch the objects for the given list of ObjectRefs, which do not already exist in the db.
    /// How it works: this function finds all object refs that are not in the DB
    /// then it downloads them by calling download_objects_from_all_authorities.
    /// Afterwards it persists objects returned.
    /// Returns a set of the object ids which failed to download
    /// TODO: return failed download errors along with the object id
    async fn fetch_objects_from_authorities(
        &self,
        // TODO: HashSet probably works here just fine.
        object_refs: BTreeSet<ObjectRef>,
    ) -> Result<HashMap<ObjectRef, Object>, SuiError> {
        let mut receiver = self
            .authorities
            .fetch_objects_from_authorities(object_refs.clone());

        let mut objects = HashMap::new();
        while let Some(resp) = receiver.recv().await {
            if let Ok(o) = resp {
                // TODO: Make fetch_objects_from_authorities also return object ref
                // to avoid recomputation here.
                objects.insert(o.compute_object_reference(), o);
            }
        }
        fp_ensure!(
            object_refs.len() == objects.len(),
            SuiError::InconsistentGatewayResult {
                error: "Failed to download some objects after transaction succeeded".to_owned(),
            }
        );
        Ok(objects)
    }

    async fn create_publish_response(
        &self,
        certificate: CertifiedTransaction,
        effects: TransactionEffects,
    ) -> Result<TransactionResponse, anyhow::Error> {
        if let ExecutionStatus::Failure { gas_used: _, error } = effects.status {
            return Err(error.into());
        }
        fp_ensure!(
            effects.mutated.len() == 1,
            SuiError::InconsistentGatewayResult {
                error: format!(
                    "Expecting only one object mutated (the gas), seeing {} mutated",
                    effects.mutated.len()
                ),
            }
            .into()
        );
        // execute_transaction should have updated the local object store with the
        // latest objects.
        let mutated_objects = self.store.get_objects(
            &effects
                .mutated_and_created()
                .map(|((object_id, _, _), _)| *object_id)
                .collect::<Vec<_>>(),
        )?;
        let mut updated_gas = None;
        let mut package = None;
        let mut created_objects = vec![];
        for ((obj_ref, _), object) in effects.mutated_and_created().zip(mutated_objects) {
            let object = object.ok_or(SuiError::InconsistentGatewayResult {
                error: format!(
                    "Crated/Updated object doesn't exist in the store: {:?}",
                    obj_ref.0
                ),
            })?;
            if object.is_package() {
                fp_ensure!(
                    package.is_none(),
                    SuiError::InconsistentGatewayResult {
                        error: "More than one package created".to_owned(),
                    }
                    .into()
                );
                package = Some(*obj_ref);
            } else if obj_ref == &effects.gas_object.0 {
                fp_ensure!(
                    updated_gas.is_none(),
                    SuiError::InconsistentGatewayResult {
                        error: "More than one gas updated".to_owned(),
                    }
                    .into()
                );
                updated_gas = Some(object);
            } else {
                created_objects.push(object);
            }
        }
        let package = package.ok_or(SuiError::InconsistentGatewayResult {
            error: "No package created".to_owned(),
        })?;
        let updated_gas = updated_gas.ok_or(SuiError::InconsistentGatewayResult {
            error: "No gas updated".to_owned(),
        })?;
        Ok(TransactionResponse::PublishResponse(PublishResponse {
            certificate,
            package,
            created_objects,
            updated_gas,
        }))
    }

    async fn create_split_coin_response(
        &self,
        certificate: CertifiedTransaction,
        effects: TransactionEffects,
    ) -> Result<TransactionResponse, anyhow::Error> {
        let call = Self::try_get_move_call(&certificate)?;
        let signer = certificate.transaction.data.signer();
        let (gas_payment, _, _) = certificate.transaction.data.gas();
        let (coin_object_id, _, _) =
            call.object_arguments
                .first()
                .ok_or_else(|| SuiError::InconsistentGatewayResult {
                    error: "Malformed transaction data".to_string(),
                })?;
        let split_amounts =
            call.pure_arguments
                .first()
                .ok_or_else(|| SuiError::InconsistentGatewayResult {
                    error: "Malformed transaction data".to_string(),
                })?;
        let split_amounts: Vec<u64> = bcs::from_bytes(split_amounts)?;

        if let ExecutionStatus::Failure { gas_used: _, error } = effects.status {
            return Err(error.into());
        }
        let created = &effects.created;
        fp_ensure!(
            effects.mutated.len() == 2     // coin and gas
               && created.len() == split_amounts.len()
               && created.iter().all(|(_, owner)| owner == &signer),
            SuiError::InconsistentGatewayResult {
                error: "Unexpected split outcome".to_owned()
            }
            .into()
        );
        let updated_coin = self.get_object(&coin_object_id).await?;
        let mut new_coins = Vec::with_capacity(created.len());
        for ((id, _, _), _) in created {
            new_coins.push(self.get_object(id).await?);
        }
        let updated_gas = self.get_object(&gas_payment).await?;
        Ok(TransactionResponse::SplitCoinResponse(SplitCoinResponse {
            certificate,
            updated_coin,
            new_coins,
            updated_gas,
        }))
    }

    async fn create_merge_coin_response(
        &self,
        certificate: CertifiedTransaction,
        effects: TransactionEffects,
    ) -> Result<TransactionResponse, anyhow::Error> {
        let call = Self::try_get_move_call(&certificate)?;
        let (primary_coin, _, _) =
            call.object_arguments
                .first()
                .ok_or_else(|| SuiError::InconsistentGatewayResult {
                    error: "Malformed transaction data".to_string(),
                })?;
        let (gas_payment, _, _) = certificate.transaction.data.gas();

        if let ExecutionStatus::Failure { gas_used: _, error } = effects.status {
            return Err(error.into());
        }
        fp_ensure!(
            effects.mutated.len() == 2, // coin and gas
            SuiError::InconsistentGatewayResult {
                error: "Unexpected split outcome".to_owned()
            }
            .into()
        );
        let updated_coin = self.get_object_info(*primary_coin).await?.into_object()?;
        let updated_gas = self.get_object_info(gas_payment).await?.into_object()?;
        Ok(TransactionResponse::MergeCoinResponse(MergeCoinResponse {
            certificate,
            updated_coin,
            updated_gas,
        }))
    }

    fn try_get_move_call(certificate: &CertifiedTransaction) -> Result<&MoveCall, anyhow::Error> {
        if let TransactionKind::Single(SingleTransactionKind::Call(ref call)) =
            certificate.transaction.data.kind
        {
            Ok(call)
        } else {
            Err(SuiError::InconsistentGatewayResult {
                error: "Malformed transaction data".to_string(),
            }.into())
        }
    }

    fn get_move_object_layout(&self, object: &Object) -> SuiResult<Option<MoveStructLayout>> {
        let resolver = ModuleCache::new(&self.store);
        object.get_layout(ObjectFormatOptions::default(), &resolver)
    }
}

#[async_trait]
impl<A> GatewayAPI for GatewayState<A>
where
    A: AuthorityAPI + Send + Sync + Clone + 'static,
{
    async fn execute_transaction(
        &mut self,
        tx: Transaction,
    ) -> Result<TransactionResponse, anyhow::Error> {
        let tx_kind = tx.data.kind.clone();
        let (certificate, effects) = self.execute_transaction_impl(tx).await?;

        // Create custom response base on the request type
        if let TransactionKind::Single(tx_kind) = tx_kind {
            match tx_kind {
                SingleTransactionKind::Publish(_) => {
                    return self.create_publish_response(certificate, effects).await
                }
                // Work out if the transaction is split coin or merge coin transaction
                SingleTransactionKind::Call(move_call) => {
                    if move_call.package == self.get_framework_object_ref().await?
                        && move_call.module.as_ref() == coin::COIN_MODULE_NAME
                    {
                        if move_call.function.as_ref() == coin::COIN_SPLIT_VEC_FUNC_NAME {
                            return self.create_split_coin_response(certificate, effects).await;
                        } else if move_call.function.as_ref() == coin::COIN_JOIN_FUNC_NAME {
                            return self.create_merge_coin_response(certificate, effects).await;
                        }
                    }
                }
                _ => {}
            }
        }
        return Ok(TransactionResponse::EffectResponse(certificate, effects));
    }

    async fn transfer_coin(
        &mut self,
        signer: SuiAddress,
        object_id: ObjectID,
        gas_payment: ObjectID,
        recipient: SuiAddress,
    ) -> Result<TransactionData, anyhow::Error> {
        let object = self.get_object(&object_id).await?;
        let object_ref = object.compute_object_reference();
        let gas_payment = self.get_object(&gas_payment).await?;
        let gas_payment_ref = gas_payment.compute_object_reference();

        let data = TransactionData::new_transfer(recipient, object_ref, signer, gas_payment_ref);

        Ok(data)
    }

    async fn sync_account_state(&self, account_addr: SuiAddress) -> Result<(), anyhow::Error> {
        let (active_object_certs, _deleted_refs_certs) = self
            .authorities
            .sync_all_owned_objects(account_addr, Duration::from_secs(60))
            .await?;

        for (object, _option_layout, option_cert) in active_object_certs {
            self.store.insert_object_unsafe(object)?;
            if let Some(cert) = option_cert {
                self.store.insert_cert(cert.digest(), &cert)?;
            }
        }

        Ok(())
    }

    async fn move_call(
        &mut self,
        signer: SuiAddress,
        package_object_ref: ObjectRef,
        module: Identifier,
        function: Identifier,
        type_arguments: Vec<TypeTag>,
        gas_object_ref: ObjectRef,
        object_arguments: Vec<ObjectRef>,
        shared_object_arguments: Vec<ObjectID>,
        pure_arguments: Vec<Vec<u8>>,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error> {
        let data = TransactionData::new_move_call(
            signer,
            package_object_ref,
            module,
            function,
            type_arguments,
            gas_object_ref,
            object_arguments,
            shared_object_arguments,
            pure_arguments,
            gas_budget,
        );
        Ok(data)
    }

    async fn publish(
        &mut self,
        signer: SuiAddress,
        package_bytes: Vec<Vec<u8>>,
        gas_object_ref: ObjectRef,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error> {
        let data = TransactionData::new_module(signer, gas_object_ref, package_bytes, gas_budget);
        Ok(data)
    }

    async fn split_coin(
        &mut self,
        signer: SuiAddress,
        coin_object_id: ObjectID,
        split_amounts: Vec<u64>,
        gas_payment: ObjectID,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error> {
        let coin_object = self.get_object(&coin_object_id).await?;
        let coin_object_ref = coin_object.compute_object_reference();
        let gas_payment = self.get_object(&gas_payment).await?;
        let gas_payment_ref = gas_payment.compute_object_reference();
        let coin_type = coin_object.get_move_template_type()?;

        let data = TransactionData::new_move_call(
            signer,
            self.get_framework_object_ref().await?,
            coin::COIN_MODULE_NAME.to_owned(),
            coin::COIN_SPLIT_VEC_FUNC_NAME.to_owned(),
            vec![coin_type],
            gas_payment_ref,
            vec![coin_object_ref],
            vec![],
            vec![bcs::to_bytes(&split_amounts)?],
            gas_budget,
        );
        Ok(data)
    }

    async fn merge_coins(
        &mut self,
        signer: SuiAddress,
        primary_coin: ObjectID,
        coin_to_merge: ObjectID,
        gas_payment: ObjectID,
        gas_budget: u64,
    ) -> Result<TransactionData, anyhow::Error> {
        let primary_coin = self.get_object(&primary_coin).await?;
        let primary_coin_ref = primary_coin.compute_object_reference();
        let coin_to_merge = self.get_object(&coin_to_merge).await?;
        let coin_to_merge_ref = coin_to_merge.compute_object_reference();
        let gas_payment = self.get_object(&gas_payment).await?;
        let gas_payment_ref = gas_payment.compute_object_reference();

        let coin_type = coin_to_merge.get_move_template_type()?;

        let data = TransactionData::new_move_call(
            signer,
            self.get_framework_object_ref().await?,
            coin::COIN_MODULE_NAME.to_owned(),
            coin::COIN_JOIN_FUNC_NAME.to_owned(),
            vec![coin_type],
            gas_payment_ref,
            vec![primary_coin_ref, coin_to_merge_ref],
            vec![],
            vec![],
            gas_budget,
        );
        Ok(data)
    }

    async fn get_object_info(&self, object_id: ObjectID) -> Result<ObjectRead, anyhow::Error> {
        if let Some(object) = self.store.get_object(&object_id)? {
            let layout = self.get_move_object_layout(&object)?;
            Ok(ObjectRead::Exists(object.compute_object_reference(), object, layout))
        } else if let Some((obj_ref, _digest)) = self.store.get_latest_parent_entry(object_id)? {
            // TODO: Add Wrapped to ObjectRead.
            fp_ensure!(
                obj_ref.2 == ObjectDigest::OBJECT_DIGEST_DELETED || obj_ref.2 == ObjectDigest::OBJECT_DIGEST_WRAPPED,
                SuiError::InconsistentGatewayResult {
                    error: format!("Object does not exist in the objects table, but found non-deleted latest reference in parent_sync table: {:?}", obj_ref)
                }.into()
            );
            Ok(ObjectRead::Deleted(obj_ref))
        } else {
            Ok(ObjectRead::NotExists(object_id))
        }
    }

    fn get_owned_objects(&mut self, account_addr: SuiAddress) -> Vec<ObjectRef> {
        self.store
            .get_account_objects(account_addr)
            .unwrap_or_default()
    }
}
