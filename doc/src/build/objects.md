---
title: Objects
---

The basic unit of storage in Sui is **object**. In contrast to many other blockchains where storage is centered around accounts and each account contains a key-value store, Sui's storage is centered around objects. A smart contract is an object (called **Move Package**), and these smart contracts manipulate **Move objects**:
* *Move Package*: a set of Move bytecode modules. Each module has a name that's unique within the package. The combination of the package ID and the name of a module uniquely identify the module. When we publish smart contracts to Sui, a package is the unit of publishing. Once a package object is published, it is immutable and can never be changed or removed. A package object can depend on other package objects that were previously published to the Sui ledger.
* *Move Object*: typed data governed by a particular Move [*module*](https://github.com/diem/move/blob/main/language/documentation/book/src/modules-and-scripts.md) from a Move package. Each object value is a [struct](https://github.com/diem/move/blob/main/language/documentation/book/src/structs-and-resources.md) with fields that can contain primitive types (e.g. integers, addresses), other objects, and non-object structs. Each object value is mutable and owned by an account address at the time of its creation, but can subsequently be *frozen* and become permanently immutable, or be *shared* and thus become accessible by other addresses.

## Object metadata

All Sui objects have the following metadata:
* A 20 byte globally unique ID. An object ID is derived from the digest of the transaction that created the object and  from a counter encoding the number of IDs generated by the transaction.
* An 8 byte unsigned integer *version* representing the number of transactions that have included this object as an output. Thus, all objects freshly created by a transaction will have version 1.
* A 32 byte *transaction digest* indicating the last transaction that included this object as an output.
* A 21 byte *owner* field that indicates how this object can be accessed. Object ownership will be explained in detail in the next section.

In addition to common metadata, objects have a category-specific, variable-sized *contents* field. For a data value, this contains the Move type of the object and its [Binary Canonical Serialization (BCS)](https://docs.rs/bcs/latest/bcs/)-encoded payload. For a package value, this contains the bytecode modules in the package.

## Object ownership
Every object has a *owner* field that indicates how this object is being owned. The ownership dictates how an object can be used in transactions. There are 4 different types of ownership:

**Owned by an account address**
This is the most common case for Move objects. A Move object upon creation in the Move code, can be [transferred](move.md#sui-move-library) to an account address. After the transfer, this object will be owned by that account address. An object owned by an account address can only be used (i.e. passed as a Move call parameter) by transactions signed by that owner account. Owned object can be passed as Move call parameter in any of the 3 forms: read-only reference (`&T`), mutable reference (`&mut T`) and by-value (`T`). It's important to note that even if an object is passed by read-only reference (`&T`) in a Move call, it's still required that only the owner of the object can make such a call. That is, the intention of the Move call is irrelevant when it comes to authenticate whether an object can be used in a transaction, the ownership is what matters.

**Owned by another object**
An object can be owned by another object. It's important to distinguish this direct ownership from *object wrapping*. An object can be wrapped/embedded in another object when you have a field of one object's struct definition to be another object type. For example:
```
struct A {
    id: VersionedID,
    b: B,
}
```
defines a object type `A` that contains a field whose type is another object type `B`. In this case, we say an object of type `B` is wrapped into an object of type `A`. With object wrapping, the wrapped object (in this example, object `b`) is not stored as a top-level object in Sui storage, and it's not accessible by object ID. Instead, it's simply part of the serialized bytes content of an object of type `A`. You can think of the case of an object being wrapped similar to being deleted, except its content still exist somewhere in another object.
Now back to the topic of object owned by another object. When an object is owned by another object, it's not wrapped. This means the child object still exists independently as a top-level object and can be accessed directly in the Sui storage. The ownership relationship is only tracked through the owner field of the child object. This can be useful if you still want to observe the child object or be able to use it in other transactions. We provide library APIs to make an object owned by another object. More details on how to do this can be found in [the Move library doc](move.md#sui-move-library)

**Immutable**
This means an object is immutable and cannot be mutated by anyone. Because of this, such an object doesn't have an exclusive owner. Anyone can use it in their Move calls. All Move packages are immutable objects: once published, they cannot be changed. A Move object can be turned into an immutable object through the [*freeze_object*](move.md#sui-move-library) library API. An immutable object can only passed as a read-only reference (`&T`) in Move calls.

**Shared (WIP)**
An object can be shared, meaning that anyone can use and mutate this object. Proper support of this is still being developed in Sui. A more detailed explanation about shared object support will come online soon. Here is a brief primer: for any other mutable object that's not shared, no two transactions can be mutating the same object at the same time since a transaction is pinned on a specific (and must be the latest) version of each object, hence Sui doesn't need to worry about reaching a consensus or ordering (it's ordered by construction). However for shared objects, in order to allow multiple transactions mutating the same object at the same time, we need a sequencer to properly order these transactions. Because of this, using a shared object can be much more expensive in terms of latency, throughput and gas cost. On the other hand, a shared object is also a powerful primitive that allows for expressing richer behavior that doesn't require central trust. Examples of this difference can be found in the two different implementations of TicTacToe in our Move examples.

## Referring to objects

There are a few different ways to concisely refer to an object without specifying its full contents and metadata, each with slightly different use cases:
* ID: the globally unique ID of the object mentioned above. This is a stable identifier for the object across time, and is useful for querying the current state of an object or describing which object was transferred between two addresses.
* Versioned ID: an (ID, version) pair. This describes the state of the object at a particular point in the object's history, and is useful for asking what the value of the object was at some point in the past or determining how fresh some view of an object is now.
* Object Reference: an (ID, version, object digest) triple. The object digest is the hash of the object's contents and metadata. An object reference provides an authenticated view of the object at a particular point in the object's history. Transactions require object inputs to be specified via object references to ensure the transaction's sender and a validator processing the transaction agree on the contents and metadata of the object.

## The transaction-object DAG: Relating objects and transactions

Transactions (and thus, certificates) take objects as input, read/write/mutate these inputs, and produce mutated or freshly created objects as output. And as discussed above, each object knows the (hash of the) last transaction that produced it as an output. Thus, a natural way to represent the relationship between objects and transactions is a directed acyclic graph (DAG) where:
* nodes are transactions.
* directed edges connect transaction output objects to transaction input objects and are labeled with object references.

To construct this graph, we add a node for each committed transaction and draw a directed edge labeled with object reference `O` from transaction `A` to transaction `B` if `A` produced object `O` (i.e., created or mutated `O`) and transaction `B` takes object `O` as an input.

The root of this DAG is a *genesis* transaction that takes no inputs and produces the objects that exist in the initial state of the system. The DAG can be extended by identifying mutable transaction outputs that have not yet been consumed by any committed transaction and sending a new transaction that takes these outputs (and optionally, immutable transaction outputs) as inputs.

The set of objects that are available to be taken as input by a transaction are the *live objects*, and the global state maintained by Sui consists of the totality of such objects. The live objects for a particular Sui address `A` are all objects owned by `A`, along with all immutable objects in the system.

When this DAG contains all committed transactions in the system, it forms a complete (and crytographically auditable) view of the system's state and history. In addition, we can use the scheme above to construct a DAG of the relevant history for a subset of transactions or objects (e.g., the objects owned by a single address).

## Further reading
* Objects are modified and created by [transactions](transactions.md).
* Objects are stored by [validators](../learn/architecture/validators.md).
