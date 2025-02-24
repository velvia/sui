// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*
 * Generated type guards for "index.ts".
 * WARNING: Do not manually change this file.
 */
import { Ed25519KeypairData, Keypair, PublicKeyInitData, PublicKeyData, TransferCoinTransaction, TxnDataSerializer, TransactionDigest, SuiAddress, ObjectOwner, ObjectRef, ObjectContentField, ObjectContentFields, ObjectContent, MovePackageContent, SuiObject, ObjectExistsInfo, ObjectNotExistsInfo, ObjectStatus, ObjectType, GetOwnedObjectRefsResponse, GetObjectInfoResponse, ObjectDigest, ObjectId, SequenceNumber, RawObjectRef, TransferCoin, RawAuthoritySignInfo, TransactionKindName, SingleTransactionKind, TransactionKind, TransactionData, EpochId, AuthorityQuorumSignInfo, CertifiedTransaction, GasCostSummary, ExecutionStatusType, ExecutionStatus, ExecutionStatusDetail, OwnedObjectRef, TransactionEffects, TransactionEffectsResponse, GatewayTxSeqNumber, GetTxnDigestsResponse, MoveModulePublish, Event, StructTag, MoveTypeTag, MoveCall, MoveCallArg, EmptySignInfo, AuthorityName, AuthoritySignature, TransactionBytes, TransactionResponse, SignedTransaction } from "./index";
import { BN } from "bn.js";

export function isEd25519KeypairData(obj: any, _argumentName?: string): obj is Ed25519KeypairData {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        obj.publicKey instanceof Uint8Array &&
        obj.secretKey instanceof Uint8Array
    )
}

export function isKeypair(obj: any, _argumentName?: string): obj is Keypair {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        typeof obj.getPublicKey === "function" &&
        typeof obj.signData === "function"
    )
}

export function isPublicKeyInitData(obj: any, _argumentName?: string): obj is PublicKeyInitData {
    return (
        (isTransactionDigest(obj) as boolean ||
            isSequenceNumber(obj) as boolean ||
            obj instanceof Buffer ||
            obj instanceof Uint8Array ||
            Array.isArray(obj) &&
            obj.every((e: any) =>
                isSequenceNumber(e) as boolean
            ) ||
            isPublicKeyData(obj) as boolean)
    )
}

export function isPublicKeyData(obj: any, _argumentName?: string): obj is PublicKeyData {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        obj._bn instanceof BN
    )
}

export function isTransferCoinTransaction(obj: any, _argumentName?: string): obj is TransferCoinTransaction {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.signer) as boolean &&
        isTransactionDigest(obj.objectId) as boolean &&
        isTransactionDigest(obj.gasPayment) as boolean &&
        isSequenceNumber(obj.gasBudget) as boolean &&
        isTransactionDigest(obj.recipient) as boolean
    )
}

export function isTxnDataSerializer(obj: any, _argumentName?: string): obj is TxnDataSerializer {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        typeof obj.newTransferCoin === "function"
    )
}

export function isTransactionDigest(obj: any, _argumentName?: string): obj is TransactionDigest {
    return (
        typeof obj === "string"
    )
}

export function isSuiAddress(obj: any, _argumentName?: string): obj is SuiAddress {
    return (
        typeof obj === "string"
    )
}

export function isObjectOwner(obj: any, _argumentName?: string): obj is ObjectOwner {
    return (
        ((obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
            isTransactionDigest(obj.AddressOwner) as boolean ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isTransactionDigest(obj.ObjectOwner) as boolean ||
            obj === "Shared" ||
            obj === "Immutable")
    )
}

export function isObjectRef(obj: any, _argumentName?: string): obj is ObjectRef {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.digest) as boolean &&
        isTransactionDigest(obj.objectId) as boolean &&
        isSequenceNumber(obj.version) as boolean
    )
}

export function isObjectContentField(obj: any, _argumentName?: string): obj is ObjectContentField {
    return (
        (isTransactionDigest(obj) as boolean ||
            isSequenceNumber(obj) as boolean ||
            obj === false ||
            obj === true ||
            Array.isArray(obj) &&
            obj.every((e: any) =>
                isSequenceNumber(e) as boolean
            ) ||
            isObjectContent(obj) as boolean ||
            Array.isArray(obj) &&
            obj.every((e: any) =>
                isObjectContent(e) as boolean
            ))
    )
}

export function isObjectContentFields(obj: any, _argumentName?: string): obj is ObjectContentFields {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        Object.entries<any>(obj)
            .every(([key, value]) => (isObjectContentField(value) as boolean &&
                isTransactionDigest(key) as boolean))
    )
}

export function isObjectContent(obj: any, _argumentName?: string): obj is ObjectContent {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isObjectContentFields(obj.fields) as boolean &&
        isTransactionDigest(obj.type) as boolean
    )
}

export function isMovePackageContent(obj: any, _argumentName?: string): obj is MovePackageContent {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        Object.entries<any>(obj)
            .every(([key, value]) => (isTransactionDigest(value) as boolean &&
                isTransactionDigest(key) as boolean))
    )
}

export function isSuiObject(obj: any, _argumentName?: string): obj is SuiObject {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        (isObjectContent(obj.contents) as boolean ||
            isMovePackageContent(obj.contents) as boolean) &&
        isObjectOwner(obj.owner) as boolean &&
        isTransactionDigest(obj.tx_digest) as boolean
    )
}

export function isObjectExistsInfo(obj: any, _argumentName?: string): obj is ObjectExistsInfo {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isObjectRef(obj.objectRef) as boolean &&
        isObjectType(obj.objectType) as boolean &&
        isSuiObject(obj.object) as boolean
    )
}

export function isObjectNotExistsInfo(obj: any, _argumentName?: string): obj is ObjectNotExistsInfo {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.objectId) as boolean
    )
}

export function isObjectStatus(obj: any, _argumentName?: string): obj is ObjectStatus {
    return (
        (obj === "Exists" ||
            obj === "NotExists" ||
            obj === "Deleted")
    )
}

export function isObjectType(obj: any, _argumentName?: string): obj is ObjectType {
    return (
        (obj === "moveObject" ||
            obj === "movePackage")
    )
}

export function isGetOwnedObjectRefsResponse(obj: any, _argumentName?: string): obj is GetOwnedObjectRefsResponse {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        Array.isArray(obj.objects) &&
        obj.objects.every((e: any) =>
            isObjectRef(e) as boolean
        )
    )
}

export function isGetObjectInfoResponse(obj: any, _argumentName?: string): obj is GetObjectInfoResponse {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isObjectStatus(obj.status) as boolean &&
        (isObjectRef(obj.details) as boolean ||
            isObjectExistsInfo(obj.details) as boolean ||
            isObjectNotExistsInfo(obj.details) as boolean)
    )
}

export function isObjectDigest(obj: any, _argumentName?: string): obj is ObjectDigest {
    return (
        typeof obj === "string"
    )
}

export function isObjectId(obj: any, _argumentName?: string): obj is ObjectId {
    return (
        typeof obj === "string"
    )
}

export function isSequenceNumber(obj: any, _argumentName?: string): obj is SequenceNumber {
    return (
        typeof obj === "number"
    )
}

export function isRawObjectRef(obj: any, _argumentName?: string): obj is RawObjectRef {
    return (
        Array.isArray(obj) &&
        isTransactionDigest(obj[0]) as boolean &&
        isSequenceNumber(obj[1]) as boolean &&
        isTransactionDigest(obj[2]) as boolean
    )
}

export function isTransferCoin(obj: any, _argumentName?: string): obj is TransferCoin {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.recipient) as boolean &&
        isRawObjectRef(obj.object_ref) as boolean
    )
}

export function isRawAuthoritySignInfo(obj: any, _argumentName?: string): obj is RawAuthoritySignInfo {
    return (
        Array.isArray(obj) &&
        isTransactionDigest(obj[0]) as boolean &&
        isTransactionDigest(obj[1]) as boolean
    )
}

export function isTransactionKindName(obj: any, _argumentName?: string): obj is TransactionKindName {
    return (
        (obj === "TransferCoin" ||
            obj === "Publish" ||
            obj === "Call")
    )
}

export function isSingleTransactionKind(obj: any, _argumentName?: string): obj is SingleTransactionKind {
    return (
        ((obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
            isTransferCoin(obj.TransferCoin) as boolean ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isMoveModulePublish(obj.Publish) as boolean ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isMoveCall(obj.Call) as boolean)
    )
}

export function isTransactionKind(obj: any, _argumentName?: string): obj is TransactionKind {
    return (
        ((obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
            isSingleTransactionKind(obj.Single) as boolean ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            Array.isArray(obj.Batch) &&
            obj.Batch.every((e: any) =>
                isSingleTransactionKind(e) as boolean
            ))
    )
}

export function isTransactionData(obj: any, _argumentName?: string): obj is TransactionData {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionKind(obj.kind) as boolean &&
        isTransactionDigest(obj.sender) as boolean &&
        isRawObjectRef(obj.gas_payment) as boolean &&
        isSequenceNumber(obj.gas_budget) as boolean
    )
}

export function isEpochId(obj: any, _argumentName?: string): obj is EpochId {
    return (
        typeof obj === "number"
    )
}

export function isAuthorityQuorumSignInfo(obj: any, _argumentName?: string): obj is AuthorityQuorumSignInfo {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isSequenceNumber(obj.epoch) as boolean &&
        Array.isArray(obj.signatures) &&
        obj.signatures.every((e: any) =>
            isRawAuthoritySignInfo(e) as boolean
        )
    )
}

export function isCertifiedTransaction(obj: any, _argumentName?: string): obj is CertifiedTransaction {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionData(obj.data) as boolean &&
        isTransactionDigest(obj.tx_signature) as boolean &&
        isAuthorityQuorumSignInfo(obj.auth_sign_info) as boolean
    )
}

export function isGasCostSummary(obj: any, _argumentName?: string): obj is GasCostSummary {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isSequenceNumber(obj.computation_cost) as boolean &&
        isSequenceNumber(obj.storage_cost) as boolean &&
        isSequenceNumber(obj.storage_rebate) as boolean
    )
}

export function isExecutionStatusType(obj: any, _argumentName?: string): obj is ExecutionStatusType {
    return (
        (obj === "Success" ||
            obj === "Failure")
    )
}

export function isExecutionStatus(obj: any, _argumentName?: string): obj is ExecutionStatus {
    return (
        ((obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
            isExecutionStatusDetail(obj.Success) as boolean ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isExecutionStatusDetail(obj.Failure) as boolean)
    )
}

export function isExecutionStatusDetail(obj: any, _argumentName?: string): obj is ExecutionStatusDetail {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isGasCostSummary(obj.gas_cost) as boolean
    )
}

export function isOwnedObjectRef(obj: any, _argumentName?: string): obj is OwnedObjectRef {
    return (
        Array.isArray(obj) &&
        isRawObjectRef(obj[0]) as boolean &&
        isObjectOwner(obj[1]) as boolean
    )
}

export function isTransactionEffects(obj: any, _argumentName?: string): obj is TransactionEffects {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isExecutionStatus(obj.status) as boolean &&
        Array.isArray(obj.shared_objects) &&
        obj.shared_objects.every((e: any) =>
            isRawObjectRef(e) as boolean
        ) &&
        isTransactionDigest(obj.transaction_digest) as boolean &&
        Array.isArray(obj.created) &&
        obj.created.every((e: any) =>
            isOwnedObjectRef(e) as boolean
        ) &&
        Array.isArray(obj.mutated) &&
        obj.mutated.every((e: any) =>
            isOwnedObjectRef(e) as boolean
        ) &&
        Array.isArray(obj.unwrapped) &&
        obj.unwrapped.every((e: any) =>
            isOwnedObjectRef(e) as boolean
        ) &&
        Array.isArray(obj.deleted) &&
        obj.deleted.every((e: any) =>
            isRawObjectRef(e) as boolean
        ) &&
        Array.isArray(obj.wrapped) &&
        obj.wrapped.every((e: any) =>
            isRawObjectRef(e) as boolean
        ) &&
        isOwnedObjectRef(obj.gas_object) as boolean &&
        Array.isArray(obj.events) &&
        obj.events.every((e: any) =>
            isEvent(e) as boolean
        ) &&
        Array.isArray(obj.dependencies) &&
        obj.dependencies.every((e: any) =>
            isTransactionDigest(e) as boolean
        )
    )
}

export function isTransactionEffectsResponse(obj: any, _argumentName?: string): obj is TransactionEffectsResponse {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isCertifiedTransaction(obj.certificate) as boolean &&
        isTransactionEffects(obj.effects) as boolean
    )
}

export function isGatewayTxSeqNumber(obj: any, _argumentName?: string): obj is GatewayTxSeqNumber {
    return (
        typeof obj === "number"
    )
}

export function isGetTxnDigestsResponse(obj: any, _argumentName?: string): obj is GetTxnDigestsResponse {
    return (
        Array.isArray(obj) &&
        obj.every((e: any) =>
            Array.isArray(e) &&
            isSequenceNumber(e[0]) as boolean &&
            isTransactionDigest(e[1]) as boolean
        )
    )
}

export function isMoveModulePublish(obj: any, _argumentName?: string): obj is MoveModulePublish {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function")
    )
}

export function isEvent(obj: any, _argumentName?: string): obj is Event {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isStructTag(obj.type_) as boolean &&
        isTransactionDigest(obj.contents) as boolean
    )
}

export function isStructTag(obj: any, _argumentName?: string): obj is StructTag {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.address) as boolean &&
        isTransactionDigest(obj.module) as boolean &&
        isTransactionDigest(obj.name) as boolean &&
        Array.isArray(obj.type_args) &&
        obj.type_args.every((e: any) =>
            isMoveTypeTag(e) as boolean
        )
    )
}

export function isMoveTypeTag(obj: any, _argumentName?: string): obj is MoveTypeTag {
    return (
        (obj === "bool" ||
            obj === "u8" ||
            obj === "u64" ||
            obj === "u128" ||
            obj === "address" ||
            obj === "signer" ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            Array.isArray(obj.vector) &&
            obj.vector.every((e: any) =>
                isMoveTypeTag(e) as boolean
            ) ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isStructTag(obj.struct) as boolean)
    )
}

export function isMoveCall(obj: any, _argumentName?: string): obj is MoveCall {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isRawObjectRef(obj.package) as boolean &&
        isTransactionDigest(obj.module) as boolean &&
        isTransactionDigest(obj.function) as boolean &&
        Array.isArray(obj.type_arguments) &&
        obj.type_arguments.every((e: any) =>
            isMoveTypeTag(e) as boolean
        ) &&
        Array.isArray(obj.arguments) &&
        obj.arguments.every((e: any) =>
            isMoveCallArg(e) as boolean
        )
    )
}

export function isMoveCallArg(obj: any, _argumentName?: string): obj is MoveCallArg {
    return (
        ((obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
            Array.isArray(obj.Pure) &&
            obj.Pure.every((e: any) =>
                isSequenceNumber(e) as boolean
            ) ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isRawObjectRef(obj.ImmOrOwnedObject) as boolean ||
            (obj !== null &&
                typeof obj === "object" ||
                typeof obj === "function") &&
            isTransactionDigest(obj.SharedObject) as boolean)
    )
}

export function isEmptySignInfo(obj: any, _argumentName?: string): obj is EmptySignInfo {
    return (
        typeof obj === "object"
    )
}

export function isAuthorityName(obj: any, _argumentName?: string): obj is AuthorityName {
    return (
        typeof obj === "string"
    )
}

export function isAuthoritySignature(obj: any, _argumentName?: string): obj is AuthoritySignature {
    return (
        typeof obj === "string"
    )
}

export function isTransactionBytes(obj: any, _argumentName?: string): obj is TransactionBytes {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.tx_bytes) as boolean
    )
}

export function isTransactionResponse(obj: any, _argumentName?: string): obj is TransactionResponse {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionEffectsResponse(obj.EffectResponse) as boolean
    )
}

export function isSignedTransaction(obj: any, _argumentName?: string): obj is SignedTransaction {
    return (
        (obj !== null &&
            typeof obj === "object" ||
            typeof obj === "function") &&
        isTransactionDigest(obj.tx_bytes) as boolean &&
        isTransactionDigest(obj.signature) as boolean &&
        isTransactionDigest(obj.pub_key) as boolean
    )
}
