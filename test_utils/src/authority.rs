// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::TEST_COMMITTEE_SIZE;
use rand::{prelude::StdRng, SeedableRng};
use std::{collections::BTreeMap, sync::Arc};
use sui::sui_commands::make_authority;
use sui_adapter::genesis;
use sui_config::{NetworkConfig, ValidatorInfo};
use sui_core::{
    authority::{AuthorityState, AuthorityStore},
    authority_aggregator::AuthorityAggregator,
    authority_client::NetworkAuthorityClient,
    authority_server::AuthorityServerHandle,
    safe_client::SafeClient,
};
use sui_types::{committee::Committee, object::Object};

/// The default network buffer size of a test authority.
pub const NETWORK_BUFFER_SIZE: usize = 65_000;

/// Make a test authority store in a temporary directory.
pub fn test_authority_store() -> AuthorityStore {
    let store_path = tempfile::tempdir().unwrap();
    AuthorityStore::open(store_path, None)
}

/// Make an authority config for each of the `TEST_COMMITTEE_SIZE` authorities in the test committee.
pub fn test_authority_configs() -> NetworkConfig {
    let config_dir = tempfile::tempdir().unwrap().into_path();
    let rng = StdRng::from_seed([0; 32]);
    NetworkConfig::generate_with_rng(&config_dir, TEST_COMMITTEE_SIZE, rng)
}

/// Spawn all authorities in the test committee into a separate tokio task.
pub async fn spawn_test_authorities<I>(
    objects: I,
    config: &NetworkConfig,
) -> Vec<AuthorityServerHandle>
where
    I: IntoIterator<Item = Object> + Clone,
{
    let mut handles = Vec::new();
    for validator in config.validator_configs() {
        let state = AuthorityState::new(
            validator.committee_config().committee(),
            validator.public_key(),
            Arc::pin(validator.key_pair().copy()),
            Arc::new(test_authority_store()),
            genesis::clone_genesis_compiled_modules(),
            &mut genesis::get_genesis_context(),
        )
        .await;

        for o in objects.clone() {
            state.insert_genesis_object(o).await
        }

        let handle = make_authority(validator, state)
            .await
            .unwrap()
            .spawn()
            .await
            .unwrap();
        handles.push(handle);
    }
    handles
}

pub fn create_authority_aggregator(
    authority_configs: &[ValidatorInfo],
) -> AuthorityAggregator<SafeClient<NetworkAuthorityClient>> {
    let voting_rights: BTreeMap<_, _> = authority_configs
        .iter()
        .map(|config| (config.public_key(), config.stake()))
        .collect();
    let committee = Committee::new(0, voting_rights);
    let clients: BTreeMap<_, _> = authority_configs
        .iter()
        .map(|config| {
            (
                config.public_key(),
                SafeClient::new(
                    NetworkAuthorityClient::connect_lazy(config.network_address()).unwrap(),
                    committee.clone(),
                    config.public_key(),
                ),
            )
        })
        .collect();
    AuthorityAggregator::new(committee, clients)
}
