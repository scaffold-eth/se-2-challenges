# 🚩 Challenge: ZK Voting

![readme-zk](./packages/nextjs/public/readme-zk.png)

Create a private, Sybil-resistant voting system where anyone can prove they’re eligible and vote exactly once **without revealing who they are**. You’ll use **zero-knowledge proofs** to keep votes unlinkable to identities, while keeping results publicly verifiable on-chain.

<details>
<summary><b>❓ Wondering how ZK voting works?</b></summary>

In traditional voting, a central authority verifies identities and counts the ballots. On-chain, we aim for **decentralization, privacy, and verifiability**, without exposing voters’ identities. There’s still a centralized authority that defines who can vote by adding addresses to the allowlist, but once registered, voters can cast their ballots privately.

Normally, on-chain voting makes every choice public. With ZK proofs, users can prove they’re on the voter list and haven’t voted yet, **without revealing their address or how they voted**. That is done by breaking the chain of ownership of two addresses.

- The **contract owner** maintains an allowlist and decides who are the voters
- **Voters** register themselves to a Merkle tree on-chain with a **commitment**
- They generate a **ZK proof of membership** using the commitment secret to prove they registered
- The **proof** is sent to a verifier contract to check validity. If it passes, the vote is accepted
- A **nullifier** ensures _one-person-one-vote_ by preventing double voting, but without linking the vote to the registered voter address

</details>

### 🤔 Why ZK voting?

Traditional on-chain voting exposes every voter’s address and choice, which breaks privacy and can lead to coercion or retaliation.
Off-chain voting hides identities but usually relies on centralized authorities that must be trusted to count votes correctly.

**ZK voting combines the best of both worlds:**

- Voters prove eligibility and uniqueness (_one-person-one-vote_)
- No one can see **who** they are or **how** they voted
- The process remains **verifiable on-chain**
- Ensures **integrity + privacy** for every voter

🌟 **Final Deliverable**
An app where anyone can create a **Yes/No question**, and registered voters can cast their votes anonymously. Results remain fully transparent and visible live on-chain.

- Deploy your contracts to a **testnet**
- Build & upload your app to a **public web server**
- Submit the URL on [**SpeedRunEthereum.com**](https://speedrunethereum.com/)! 🚀

> 💬 Meet other builders working on this challenge and get help in the ZK Voting Challenge [Telegram Group](https://t.me/+dkPzMUauQpY5N2My).

## 🚀 Checkpoint 0: Environment

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- [Yarn (v2+)](https://yarnpkg.com/getting-started/install)
- [Git](https://git-scm.com/downloads)
- [Nargo](https://noir-lang.org/docs/getting_started/quick_start#installation) (v1.0.0-beta.3)
- [bb](https://barretenberg.aztec.network/docs/getting_started/) (v0.82.2)

> 🚨 **Windows Users**: Noir (`nargo`, `bb`) isn’t natively supported on Windows.
> Please install and run Noir inside **WSL (Windows Subsystem for Linux)**.
> 🚨

### 📦 Install nargo and bb

⚡ Use **`nargo version = 1.0.0-beta.3`** for this challenge.

Install with:

```javascript
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
noirup -v 1.0.0-beta.3
nargo --version
```

⚡ Use bb version = 0.82.2 (works with this challenge).

Install with:

```javascript
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/next/barretenberg/bbup/install | bash
bbup -v 0.82.2
bb --version
```

If you are using vscode you may want to install the [Noir Language Support](https://marketplace.visualstudio.com/items?itemName=noir-lang.vscode-noir) extension.

Then download the challenge to your computer and install dependencies by running:

```javascript
npx create-eth@1.0.2 -e buidlguidl/challenge-zk-voting challenge-zk-voting
cd challenge-zk-voting
```

In the same terminal, start your local network (a blockchain emulator in your computer):

```javascript
yarn chain
```

In a second terminal window, 🛰 deploy your contract (locally):

```javascript
cd challenge-zk-voting
yarn deploy
```

In a third terminal window, start your 📱 frontend:

```javascript
cd challenge-zk-voting
yarn start
```

> 👩‍💻 Rerun yarn deploy whenever you want to deploy new contracts to the frontend. If you haven't made any contract changes, you can run yarn deploy --reset for a completely fresh deploy.

## Checkpoint 1: 🗳️🔒 Structure of the Challenge and Voting Contract

### **💬 What you’ll build**

A zk-powered voting flow with three phases:

1. **Registration:** Users submit a commitment that gets added to an incremental Merkle tree (you’ll learn more about this later).
2. **Proof Generation:** Users locally generate a ZK proof based on their secret and the Merkle tree.
3. **Vote:** With the proof, users call the voting function to cast their vote anonymously from a separate address that is not linked to their registered address.

To make this flow possible, we’ll combine:

- [**Noir**](https://noir-lang.org/) → for building ZK circuits and producing a verifier contract
- **Solidity** → to extend the voting contract and connect it with the verifier
- **Next.js/TypeScript** → to build the frontend where users generate proofs and cast votes seamlessly

### 🛠️ Core Features of the Voting Dapp

Our contract will support three main functions:

1. **Allowlisting** ✅ (already implemented)
2. **Voter Registration** (to be built using a Merkle tree)
3. **Voting** (validated with ZK proofs)

👉 Registration is where we’ll start: we need a Merkle tree to prove a user is registered (has a commitment in the tree) and hasn’t voted yet.

### 👀 Explore the Frontend

📱 Open [http://localhost:3000](http://localhost:3000/) to spin up your app.

🖥️ Head over to the **Voting** page and take a look at the frontend you’ll soon bring to life.

![overview-zk](./packages/nextjs/public/overview-zk.png)

### 🔍 Inspect the Contract

🔍 Next, switch to the **`Debug Contracts`** tab. For now, you should see just one contract there — **`Voting`**.

📁 The contract lives in **`packages/hardhat/contracts/Voting.sol`**

🔍 Open it up and check out the placeholder functions. Each of them represents a key piece of the voting logic.
If you can already explain what they’re supposed to do, you’re ahead of the game! 😎

But this time you won’t just be working on the smart contract **🙂**

### **🥅 Goals**

- [ ] 📝 Review **`Voting.sol`** functions for an overall understanding

## **Checkpoint 2: 📋🌲 Register with a Smart Contract Merkle Tree**

Time to let users actually register!

Here we’ll implement a `register` function that:

1. Takes a **commitment** from the caller
2. Verifies they’re on the allowlist
3. Checks uniqueness
4. Inserts the commitment into a **lean Incremental Merkle Tree (LeanIMT)**

> **💡 LeanIMT in Short:** The tree is pre-filled with zeros. New leaves replace them, merging upward like a binary counter. Index parity (even = left, odd = right) ensures correct order. Only the **frontier** is stored, making LeanIMT cheap, scalable, and perfect for ZK apps like private voting.

<details>
<summary><b>🧠 What’s LeanIMT, and Why Use It?</b></summary>
**LeanIMT (Lean Incremental Merkle Tree)** is an on-chain data structure that keeps a Merkle root up-to-date cheaply and efficiently.

#### 🧱 Normal Merkle Trees

A standard Merkle tree stores every node. As more leaves are added, recomputing and storing all these hashes becomes very costly in gas and storage.

#### ✂️ LeanIMT’s Optimization

LeanIMT avoids this by:

- Fixing the **tree depth** from the start (e.g. 16 levels → 65,536 leaves)
- Prepopulating all positions with **zero values** (hashes of zero)
- Storing only a handful of values called the **frontier** (at most one active node per level)

New leaves replace zeros, and only the frontier updates. Everything else is assumed to remain zero, so the root can always be recomputed.

#### 🔄 Updating the Tree (Binary Counter Pattern)

Adding leaves works like a **binary counter**:

- If a slot is empty → put the new leaf there.
- If a slot is full → hash the two values, clear the slot, and carry the result up.
- If the next slot is also full → repeat until an empty slot is found.

> 💡 This is just like `0111 + 1 = 1000` in binary: lower bits reset, and the carry moves up.

#### ⚖️ Index Parity (Order Matters)

Since `Hash(left, right) ≠ Hash(right, left)`, **parity** decides position:

- **Even index leaves (0, 2, 4, …)** go on the **left**
- **Odd index leaves (1, 3, 5, …)** go on the **right**, triggering a merge with the left sibling

#### 🌱 Example with 4 Leaves

1. **Leaf 0 (even)** → slot 0, left child
   _(Frontier: [L0, 0, 0…])_

2. **Leaf 1 (odd)** → slot 0 full →
   `H01 = Hash(L0, L1)` (**L0 left, L1 right**) → carried to slot 1
   _(Frontier: [0, H01, 0…])_

3. **Leaf 2 (even)** → slot 0, left child
   _(Frontier: [L2, H01, 0…])_

4. **Leaf 3 (odd)** → slot 0 full →
   `H23 = Hash(L2, L3)` (**L2 left, L3 right**) → carried to slot 1
   Slot 1 full →
   `H0123 = Hash(H01, H23)` (**H01 left, H23 right**) → carried to slot 2
   _(Frontier: [0, 0, H0123…])_

👉 At this point, the frontier has just one value (`H0123` at slot 2), but together with zeros it defines the full root.

#### ⚡ Why Use LeanIMT?

- **Cheap & predictable**: only the frontier updates
- **Append-only**: leaves can be added but not removed
- **ZK-friendly**: [Poseidon](https://www.poseidon-hash.info/) roots work well in zero-knowledge proofs

</details>

Merkle trees aren’t required for ZK proofs, but they’re the **most efficient way** to prove membership in a large set.
In our voting app, they let us cheaply and scalably prove _“I’m registered”_ without showing _who_ you are.

> 💡 In Checkpoint 3, we’ll dive deeper into what commitments are and how they’re used.
> For now, think of them as placeholders that users submit during registration.

### ✅ Registration Rules

When a user registers, we enforce **two key checks**:

1. Address hasn’t registered before
2. Commitment is unique (no duplicates)

👉 If either fails → revert.
👉 If another address tries to reuse the same commitment → reject as well.

> 💡 Don’t forget to implement the necessary state variables.

### 🌱 Inserting Into the Merkle Tree

Once checks pass:

- Insert the new leaf into the incremental Merkle tree (`LeanIMT`) using the commitment as leaf value (library is already imported in `Voting.sol`). Call `insert()` directly on it.
- Store the Merkle tree in a state variable: `s_tree`.
- Emit an event with the **leaf index** + **value**:
  - **Index** = leaf’s position when inserted
  - **Value** = the commitment

> 💡 Explore the LeanIMT library itself to see exactly what happens inside `insert()`.

<details>
<summary><b>🧠 🦉 Guiding Questions</b></summary>

<details>
<summary>❓ Question 1</summary>

What conditions must be true for someone to register?
_(Hint: allowlist + not registered before)_

</details>

<details>
<summary>❓ Question 2</summary>

How will you detect and reject a reused commitment, even from another address?

</details>

<details>
<summary>❓ Question 3</summary>

Which **state variables** do you need to track both users and commitments?

</details>

<details>
<summary>❓ Question 4</summary>

When emitting `NewLeaf`, how will you determine the correct index?
_(💡 Try `tree.size()`, but adjust carefully)_

</details>

After thinking through the guiding questions, have a look at the solution code!

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```javascript
///////////////////////
/// State Variables ///
///////////////////////

/// Checkpoint 2 //////
mapping(address => bool) private s_hasRegistered;
mapping(uint256 => bool) private s_commitments;

LeanIMTData private s_tree;

//////////////////
/// Functions ///
//////////////////

function register(uint256 _commitment) public {
/// Checkpoint 2 //////
if (!s_voters[msg.sender] || s_hasRegistered[msg.sender]) {
revert Voting__NotAllowedToVote();
}
if (s_commitments[_commitment]) {
revert Voting__CommitmentAlreadyAdded(_commitment);
}
s_commitments[_commitment] = true;
s_hasRegistered[msg.sender] = true;
s_tree.insert(_commitment);
emit NewLeaf(s_tree.size - 1, _commitment);
}

```

</details>
</details>

### 🔧 Before Testing

Scroll down to the functions **`getVotingData()`** and **`getVoterData(address _voter)`** in your contract.

👉 Uncomment everything below: `/// Checkpoint 2 ///`

Then run:

```javascript
yarn test --grep "Checkpoint2"
```

### 🚀 Tests Passed? You’re Almost There!

Great job! If your tests are passing, you’re just one step away from deployment! 🚀

Before deploying, make one important change:

1. Open **`00_deploy_your_voting_contract.ts`**
2. Set your address as the `ownerAddress`
3. Comment out `leanIMTAddress`
4. Uncomment deployment of both `poseidon3` and `leanIMT`

> 💡 **Poseidon3** is the hash function we use. More on that later.

Once that’s done, you’re ready to deploy! 🔗

Run`yarn deploy` and check out the front-end

### **🥅 Goals**

- [ ] Understand how lean incremental Merkle trees work
- [ ] Implement the `register` function in **`Voting.sol`**

## Checkpoint 3: ✍️🔒 Write Your First ZK Circuit – Commitment Scheme

Welcome to the Noir world! 🎉

This is where we’ll write our very first **ZK circuit**, the building block for generating an on-chain verifier.

The goal here: let a user **prove they are registered to vote (their commitment is in the Merkle tree)** without revealing their address.

👉 You’ll use **[Noir](https://noir-lang.org/)**, a DSL (domain-specific language) for ZK circuits, to generate a **Solidity verifier contract** — something that would be extremely difficult to implement by hand.

<details>
<summary>🧠 What Are Zero-Knowledge Circuits?</summary>

A **circuit** is essentially a very complex math equation that represents a program.
Noir lets us write a program and compile it into that math equation.

The magic (math) of ZK allows us to **prove and verify** that we know the solution to that equation **without revealing the solution itself**.
This is a powerful primitive that enables both **privacy** and **offloading computation** from expensive places (like the Ethereum blockchain) to cheap ones (like your CPU or GPU).

- 👉 Noir lets us write the “program,” compile it into ZK math, and export a **Solidity verifier contract**.
- Zero-knowledge magic makes it possible to prove and verify we know the solution **without revealing the solution itself**.

**Why is this powerful?**

- 🔒 Preserves privacy
- ⚡ Moves heavy computation away from expensive places (Ethereum blockchain) to cheap ones (your CPU/GPU)

</details>

> 💡 ZK proofs let someone prove something is true without revealing any other details about it.

### 🔑 Step 1: Understand Commitment Schemes

Before we dive into the Merkle root, we need to build the **commitment**.

Commitment schemes allow someone to “lock in” a value without revealing it, while keeping the option to reveal it later.

In our case:

- We combine a **nullifier** and a **secret** (both private).
- Hash them together → this is the **commitment** stored on-chain as a Merkle leaf when the user registers.

The **nullifier** plays a special role:

- It lets the Solidity contract track if a proof has already been used.
- If the same nullifier appears again, the vote is rejected (prevents double-voting).

> 💡 Commitment schemes allow a user to commit to a chosen value (or values) while keeping it hidden, with the ability to reveal the value later.

### 🔑 Step 2: Set Up Your Noir Project

Head to the folder **`packages/circuits`** and open **`src/main.nr`**.
This is the entry point of your Noir circuit. Everything we want to prove — and therefore all constraints — must happen inside `main`.

- Want to create the same structure in another project?
  Run `nargo init` in a new project. This creates the full folder structure along with a `main.nr` file.

**Nargo** is Noir’s command-line tool. It lets you:

- start new projects
- compile circuits
- run them
- and test directly from the terminal

At the top of the file, you can see that there are already the two [Poseidon hash functions](https://www.poseidon-hash.info/) imported:

- `hash_1` → hashes a single value
- `hash_2` → hashes two values

> 💡 Poseidon3 is the hash function used to combine left/right child pairs in the LeanIMT binary Merkle tree.
> It’s chosen over SHA256/Keccak256 because it’s much cheaper and faster inside ZK circuits, while Keccak256 is computationally very expensive to implement in proof systems.

### 🔑 Step 3: Inputs

The `main` function already lists three parameters (others are commented for later checkpoints).

<details>
<summary><b>🔐 Private vs. Public Inputs</b></summary>

**Public inputs** (marked with the `pub` keyword) are visible to the verifier/on-chain and become part of the statement being proven.

**Private inputs** (also called witnesses) stay hidden. They never leave the prover’s machine. They’re only used locally to build the proof.

The verifier then checks this proof against the public inputs, which guarantees that the hidden private inputs existed and satisfied the circuit’s constraints — all without revealing them.

📖 Learn more about input visibility in the [Noir docs](https://noir-lang.org/docs/noir/concepts/data_types#private--public-types).

</details>

**Public input (revealed to verifier):**

- `nullifier_hash: pub Field` → the public hash of the private nullifier, tracked on-chain to enforce one-time voting

> 🧠 We hash the nullifier because it isn’t exposed as a public input, otherwise everyone would see it.
> Using the hashed version adds an extra layer of privacy and ensures there’s no direct link between the nullifier and the commitment.

**Private inputs (hidden witness values):**

- `nullifier: Field` → private value used both for `nullifier_hash` and commitment
- `secret: Field` → private value combined with `nullifier` to form the commitment

> 💡 The `Field` type is Noir’s default number type. It’s like `uint` in Solidity, but always restricted to a finite range (a “field”), so math stays consistent inside ZK circuits. See the docs [here](https://noir-lang.org/docs/noir/concepts/data_types).

### 🔑 Step 4: Assert and Re-Hash

Inside the circuit:

1. Recompute the `nullifier_hash` by hashing the private `nullifier`.
2. Use `assert` to check it equals the public `nullifier_hash`.

This guarantees:

- The prover really knows the secret nullifier.
- The nullifier itself stays hidden (only the hash is public).

> 💡 `assert` ensures a condition must hold true for the proof to be valid. It’s the main check we do in circuits.

### 🔑 Step 5: Build the Commitment

Now, hash the `nullifier` and `secret` together — this is the **commitment**.
Here we use `hash_2`.

- The commitment is the leaf of the Merkle tree.
- In the next checkpoint, we’ll use it to calculate the Merkle root.

This setup ensures:

- **Privacy**: the nullifier itself is never public.
- **Security**: the `nullifier_hash` prevents someone from submitting the same proof multiple times (we track them inside our smart contract).

### **✅ Well done!**

> 🧠 At its core, a circuit is just a set of assertions, enforcing conditions that must always hold true. That’s the heart of it.

You just wrote your first **Noir circuit**! 🎉

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>❓ Question 1</summary>

How can you re-create the `nullifier_hash` inside the circuit to check it matches the public input?

</details>

<details>
<summary>❓ Question 2</summary>

How will you combine the `nullifier` and `secret` to generate the commitment?

</details>

After thinking through the guiding questions, have a look at the solution code!

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```rust
use std::hash::poseidon::bn254::hash_1;
use std::hash::poseidon::bn254::hash_2;

fn main(
    // public inputs
    nullifier_hash: pub Field,
    // private inputs
    nullifier: Field,
    secret: Field,
) {
    ////// Checkpoint 3 //////
    let computed_nullifier_hash: Field = hash_1([nullifier]);
    assert(computed_nullifier_hash == nullifier_hash);

    let commitment: Field = hash_2([nullifier, secret]);
}
```

</details>
</details>

In here we won’t run any code. That will be done later.

### **🥅 Goals**

- [ ] Understand commitment schemes
- [ ] Write your first Noir circuit and understand the `assert` function

## Checkpoint 4: 🌳✅ Implement Root Check in ZK Circuit

Time to unlock the **core of our circuit** — proving that the user really registered and has a commitment in the Merkle tree.

If the root you compute inside the circuit matches the public root on-chain, you’re in and allowed to vote! 🗳️

### 🔑 What’s New Here?

We extend our circuit to handle **Merkle proofs**. That means:

1. Traverse up the tree using your **leaf index** and **siblings**
2. Recompute the **root** inside the circuit
3. Compare it against the public `root`

If they match → ✅ you’re a valid voter.

### 🧩 Step 1: Import the Merkle Helper

At the top of your circuit, **uncomment the import** of `binary_merkle_root`.

> 👉 This comes from **zk-kit**, the Noir counterpart to the Solidity Merkle library used in your contract.
> It’s the tool we’ll use to recompute the root inside the circuit.

### 🧩 Step 2: Extend the Inputs

We now need more inputs to make Merkle proofs work.

**Public (visible / on-chain):**

- `root: pub Field` → the Merkle root of the tree state at the current moment.
  - Stored on-chain and used as the reference point.
  - The circuit recomputes a root and checks it matches this one.
- `vote: pub bool` → the chosen option Yes or No (`0` or `1`).
  - It binds the proof to the voter’s choice.
  - Even if someone front-runs the proof, the outcome would still be the same, since the vote is baked into the circuit.
- `depth: pub u32` → the Merkle tree’s depth (number of levels).

**Private (hidden witness values):**

- `index: Field` → the leaf’s position in the Merkle tree.
  - Must stay private, otherwise the proof would reveal which leaf belongs to which voter.
- `siblings: [Field; 16]` → the array of neighbor hashes needed to climb from the leaf to the root.
  - Only siblings are included; parent nodes are recomputed inside the circuit.
  - Since Noir doesn’t allow dynamic arrays, we use a fixed length of 16.
  - This supports up to 2^16 leaves (65,536 voters).

> 🧠 Arrays in Noir must be fixed length — no dynamic arrays.

### 🧩 Step 3: Count Siblings

The `siblings` array is set to length 16, but not all entries are used.

- Count the non-zero entries → this gives you the real path length, `siblings_num`.
- Add a safety bound: assert that the claimed `depth` can’t exceed the array’s length of 16 (prevents out-of-bounds).

### 🧩 Step 4: Convert Index → Bits

Convert the leaf’s `index` into **16 little-endian bits** using `index.to_le_bits()`.

This mirrors how the Merkle tree is built from the bottom up. The bit array must align with the fixed `siblings: [Field; 16]`.

- Each bit tells if the node is on the **left (0)** or **right (1)** at that level, and controls the hashing order with `siblings[i]`.

Example:

- Leaf index `5` → `[1,0,1,0,…]` = right, left, right, left.

> 💡 Sketch the Merkle tree to see how the index bits guide the path.

> 🧠 Little-endian means writing the binary digits starting with the **rightmost bit** (the smallest part of the number).
> For example, 4 in binary is `100`, but in little-endian it becomes `[0,0,1,…]`.

### 🧩 Step 5: Compute the Root

Now compute the Merkle tree root.
Use `binary_merkle_root` from the imported zk-kit library.

> 💡 See the [function here](https://github.com/zk-kit/zk-kit.noir/blob/main/packages/binary-merkle-root/src/lib.nr) for expected parameters.
> When passing the Merkle path depth, use `siblings_num` (the number of non-zero sibling hashes).
> This is safer since it reflects the actual path length rather than the full array size.

### 🧩 Step 6: Compare Roots

Finally, assert that your `computed_root` equals the public `root` input.

If they are the same → ✅ your commitment is valid and included in the tree.

### 🧩 Step 7: Bind the Vote

Before wrapping up, bind the vote to the proof:

- The `vote` input is declared as a public boolean, so it’s already restricted to `0` or `1`.
- But if we don’t use it in a constraint, the compiler will warn that it’s unused.

To fix this:

1. Cast `vote` into a `Field`.
2. Enforce the equation `x² = x`.

### **✅ Well done!**

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>❓ Question 1</summary>

How can you loop through the `siblings` array to count only the non-zero entries and store that number as `siblings_num`?

</details>

<details>
<summary>❓ Question 2</summary>

What assert can you add to make sure the given `depth` never exceeds the maximum length of `siblings` (16)?

</details>

<details>
<summary>❓ Question 3</summary>

How will you turn the leaf’s `index` into 16 little-endian bits with `to_le_bits()` so you know left vs. right at each level?

</details>

<details>
<summary>❓ Question 4</summary>

Which inputs do you pass into `binary_merkle_root` to recompute the path up to the root?
(Hint: The first input is the hash function — you want to hash 2 values)

</details>

<details>
<summary>❓ Question 5</summary>

How will you compare your `computed_root` against the public `root` to finish the membership proof?

</details>

<details>
<summary>❓ Question 6</summary>

How do you cast and constrain `vote` so it becomes part of the circuit and avoids the “unused variable” warning?

</details>

After thinking through the guiding questions, have a look at the solution code!

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```rust
use std::hash::poseidon::bn254::hash_1;
use std::hash::poseidon::bn254::hash_2;
////// Checkpoint 4 //////
use binary_merkle_root::binary_merkle_root;

fn main(
    // public inputs
    nullifier_hash: pub Field,
    // private inputs
    nullifier: Field,
    secret: Field,
    ////// Checkpoint 4 //////
    // public inputs
    root: pub Field,
    vote: pub bool,
    depth: pub u32,
    // private inputs
    index: Field,
    // max of 2^16 leaves --> 65536 leaves
    siblings: [Field; 16],
) {
    ////// Checkpoint 3 //////
    let computed_nullifier_hash: Field = hash_1([nullifier]);
    assert(computed_nullifier_hash == nullifier_hash);

    let commitment: Field = hash_2([nullifier, secret]);

    ////// Checkpoint 4 //////
    let mut siblings_num = 0;
    for i in 0..siblings.len() {
        if siblings[i] != 0 {
            siblings_num += 1;
        }
    }
    assert(depth <= siblings.len());

    let index_bits: [u1; 16] = index.to_le_bits();

    let computed_root = binary_merkle_root(hash_2, commitment, siblings_num, index_bits, siblings);

    assert(computed_root == root);

    // just vote binding, to prevent compiler warnings
    let vote_field = vote as Field;
    assert((vote_field * vote_field) == vote_field);
}
```

</details>
</details>

In here we won’t run again any code. We will do that later.

### **🥅 Goals**

- [ ] Recreate the Merkle root inside the circuit
- [ ] Understand bit manipulation in Noir with little-endian

## Checkpoint 5: 📝 Creating the Solidity Verifier Contract

Now that your circuit is set up and running, it’s time to bring it to life on-chain.
The end goal of this checkpoint is to **generate the Solidity verifier contract**, the bridge that lets Ethereum validate your zero-knowledge proofs.

<details>
<summary> Testing your Circuit inside your Noir folder (optional)</summary>

1. `cd` into your circuits folder.
2. Run `nargo check`. This generates a Prover.toml file where you can paste in the arguments you want the circuit to run with. Keep in mind: there can be quite a lot of inputs, and in our case it’s not entirely straightforward, you’ll need to calculate all the necessary hashes upfront before you can pass them in.
3. Run `nargo execute`. This compiles your circuit and executes it locally using the inputs from Prover.toml. If everything works, it produces a witness file. For debugging, you can also log values from inside the circuit by calling `std::println()`.

> 💡 A **witness** is the full set of variable assignments that satisfy your circuit’s constraints. It includes:

- All **public inputs**
- All **private inputs**
- All **intermediate values** computed during execution

The witness file is the actual input the prover consumes in order to construct a proof.

</details>

<details>
<summary>Creating a proof with Barretenberg (bb)</summary>

After testing your circuit and producing a witness, the next step is to actually create a **zero-knowledge proof**.

#### 🔹 What is Barretenberg (bb)?

Barretenberg is the **zero-knowledge proving system** that Noir is built on.

- Think of **Noir (`nargo`)** as the _language and compiler_: it takes your high-level program (`main.nr`) and compiles it into a mathematical object called an **ACIR circuit**.
- **Barretenberg (`bb`)** is the _engine_: it runs the heavy cryptography to generate and verify proofs from those circuits.

Without `bb`, your Noir code is just a description of constraints.
With `bb`, those constraints get turned into **cryptographic proofs** that others can trust.

#### 🔹 Step 1: Prove with `bb prove`

```javascript
bb prove -b <bytecode> -w <witness> -o <output>
```

Here’s what happens:

- `-b` → the circuit bytecode in `circuits.json`
- `-w` → the witness file you created with `nargo execute`
- `-o` → specifies the file path where the generated proof will be saved

`bb` takes the circuit + the solution (witness) and runs the **UltraHonK proving scheme**.

> 💡 **UltraHonK** is the default proving scheme used by Barretenberg, a modern, highly optimized successor to PLONK-style systems.

**Output:** a proof file — a tiny, verifiable object that says:

> “I know private inputs that satisfy the circuit’s constraints, given these public inputs.”

Importantly, the proof **reveals nothing** about your private inputs.

#### 🔹 Step 2: Generate the Verification Key (vk)

Before you (or anyone else) can verify a proof, you need a **verification key (vk)**.

- The vk is a **compact summary of the circuit**: it encodes the rules and constraints of your program in a form the verifier can understand.
- It is generated **once per circuit** (from the circuit’s ACIR bytecode) and can then be reused for verifying any number of proofs created for that circuit, as long as the circuit doesn’t change.

To generate it:

```javascript
bb write_vk -b <bytecode> -o <output>
```

- `-b` → the same bytecode from `nargo compile`
- `-o` → the file path where the verification key will be saved

> 💡 When you run `bb verify`, the verifier must know **what circuit** the proof claims to satisfy.
> The vk is that reference. Without the vk, the proof file is meaningless — it would be like having a lock but no keyhole to check against.

#### 🔹 Step 3: Verify the Proof

With both the **proof file** and the **vk**, anyone can check validity

```javascript
bb verify -k <vk> -p <proof>
```

- `-k` → the verification key
- `-p` → the proof file

✅ Off-chain, this runs instantly.
🔗 On-chain, the vk is embedded into the Solidity verifier contract (see below).

</details>

### 🔹 Step 1: Compile Your Circuit

> 🚨 For all Noir (`nargo` or `bb`) commands, first `cd` into the `packages/circuits` directory.

Make sure all recent changes are applied:

```javascript
nargo compile
```

### 🔹 Step 2: Generate the Verification Key (vk)

Proof generation requires a **verification key (vk)**.
It’s the verifier’s compact “rulebook” for your circuit.

You’ll need to generate a new vk **any time you make a change to your circuit**.

```javascript
bb write_vk --oracle_hash keccak -b ./target/circuits.json -o ./target/
```

The vk summarizes your circuit’s constraints (all those `assert`s you added!) and is reused for verifying all proofs
(see **Creating a proof with Barretenberg** above for more context).

> ⚠️ Use `--oracle_hash keccak` when creating a verification key so the hashing matches Ethereum’s Keccak standard.

### 🔹 Step 3: Generate the Solidity Verifier Contract

Now let’s build the contract itself:

```javascript
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
```

This creates a **`Verifier.sol`** file in **`packages/circuits/target`**.
The vk is embedded into this contract, enabling Ethereum to check proofs generated for your circuit.

🔍 **Inspecting the Contract**

The verifier contract may look overwhelming at first, but here’s what to focus on:

- ✅ Check that values like `NUMBER_OF_PUBLIC_INPUTS` match what you expect for your proof.
- 🚪 The main entry point is the `verify` function:

```javascript
interface IVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}
```

This is the function your application will call to confirm whether a proof is valid.

> 🚨🚨 Always delete the files in the `target` folder when you change your circuit or inputs to ensure a clean setup.
> **Whenever the circuit changes, you must also regenerate and replace the verifier smart contract in your Solidity project. 🚨🚨**

### ✅ Verifier Contract Created!

You’ve now successfully generated the Solidity verifier contract.
This is the critical piece that connects your off-chain proof generation with on-chain proof verification.

Next, we’ll integrate it into your project and actually put it to work.

### **🥅 Goals**

- [ ] Understand how witness, vk, and proof work together
- [ ] Create the Solidity verifier contract

## Checkpoint 6: 🗳️ Enable Voting – Bring in the Verifier Contract

You’ve built the circuit, created the verifier contract — now it’s time to plug it into our **`Voting.sol`** and enable voting! 🗳️

### 🔹 Step 1: Bring in the Verifier Contract

1. Copy your verifier contract into **`packages/hardhat/contracts`**.
2. Open **`00_deploy_your_voting_contract.ts`** and:
   - Uncomment the verifier deployment
   - Comment out the `verifierAddress`
   - Update the `args` to match your setup

3. In **`Voting.sol`**:
   - At the top, import the verifier contract (just uncomment the existing line)
   - In the constructor, initialize the verifier and store it in a variable called `i_verifier`

### 🔹 Step 2: Build the `vote` Function

Inside the `vote` function, voters will send their:

- **proof** → the cryptographic proof (later built in the frontend)
- **public inputs** → `nullifierHash`, `root`, `vote`, and `tree depth`

Before counting votes, we enforce some **rules**:

#### 1. Prevent Double-Voting 🛑

- Check if the `_nullifierHash` has already been used.
- If yes → revert the transaction.
- Track used nullifiers with a mapping: `s_nullifierHashes`.

👉 Without this safeguard, anyone could replay the same proof/inputs over and over to vote multiple times.
That’s why **nullifiers are the cornerstone** of privacy-preserving voting.

#### 2. Verify the Proof 🔒

- Call the `verify()` function on `i_verifier` and pass in the proof + public inputs.
- The verifier expects **public inputs as a `bytes32[]` array**, in **exactly the same order** as in your circuit file.
- If verification fails → revert the transaction.

✅ Once both checks pass:

- Increment `s_yesVotes` or `s_noVotes` accordingly
- Emit the `VoteCast` event

> 🚨⚠️ Go to packages/hardhat/contracts/mocks and uncomment all the code

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>❓ Question 1</summary>

Before writing the voting logic, how can you stop a `_nullifierHash` from being reused so no one can vote twice?
Make sure to revert with the correct error.

</details>

<details>
<summary>❓ Question 2</summary>

When passing inputs to the verifier, how do you build the `bytes32[]` array and in what order should you place `_nullifierHash`, `_root`, `_vote`, and `_depth`?

</details>

<details>
<summary>❓ Question 3</summary>

After calling `i_verifier.verify(_proof, publicInputs)`, what condition should you check, and what should happen if it fails?

</details>

<details>
<summary>❓ Question 4</summary>

Once the proof is verified, how do you decide whether to increment `s_yesVotes` or `s_noVotes` and then emit the `VoteCast` event?
_(Hint: `_vote` comes as 0 or 1)_

</details>

After thinking through the guiding questions, have a look at the solution code:

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```javascript
///////////////////////
/// State Variables ///
///////////////////////

/// Checkpoint 6 //////
IVerifier public immutable i_verifier;
mapping(bytes32 => bool) private s_nullifierHashes;

//////////////////
/// Constructor ///
//////////////////

constructor(address _owner, address _verifier, string memory _question) Ownable(_owner) {
    s_question = _question;
    /// Checkpoint 6 //////
    i_verifier = IVerifier(_verifier);
}

//////////////////
/// Functions ///
//////////////////

function vote(bytes memory _proof, bytes32 _nullifierHash, bytes32 _root, bytes32 _vote, bytes32 _depth) public {
        /// Checkpoint 6 //////
        if (s_nullifierHashes[_nullifierHash]) {
            revert Voting__NullifierHashAlreadyUsed(_nullifierHash);
        }
        s_nullifierHashes[_nullifierHash] = true;

        bytes32[] memory publicInputs = new bytes32[](4);
        publicInputs[0] = _nullifierHash;
        publicInputs[1] = _root;
        publicInputs[2] = _vote;
        publicInputs[3] = _depth;

        if (!i_verifier.verify(_proof, publicInputs)) {
            revert Voting__InvalidProof();
        }

        if (_vote == bytes32(uint256(1))) {
            s_yesVotes++;
        } else {
            s_noVotes++;
        }

        emit VoteCast(_nullifierHash, msg.sender, _vote == bytes32(uint256(1)), block.timestamp, s_yesVotes, s_noVotes);
    }
```

</details>
</details>

Once implemented, run your tests to make sure everything works:

```javascript
yarn test --grep "Checkpoint6"
```

### **✅ Tests Passed? You're So Close!**

If your tests are green, congratulations — you’ve just completed the **core `Voting.sol` contract!** 🎉

That means you now have a fully private voting system where:

- ✅ Eligibility is proven via ZK proofs
- ✅ Double-voting is prevented
- ✅ Results are transparently tracked

Run `yarn deploy` and then we’ll move on to integrating the **front-end** so users can interact with your voting app.

### **🥅 Goals**

- [ ] Understand how nullifiers help with preventing double-voting
- [ ] Correctly pass proof and public inputs into the proof verification

## Checkpoint 7: 🌱 Create Your Commitment – The First Step to Registration

You’ve got your `Voting.sol` contract ready, and the verifier is hooked in.

Now it’s time to let **real users** step into the process and bring the register button to life.

But here’s the deal: before anyone can vote, they need to prove they’re registered.

That starts right here, with **creating a commitment**.

Think of this as the **secret handshake** for your voting system:

- Each user makes their own **nullifier** (to prevent double voting)
- Pairs it with a **secret** (their private ticket)
- And from these, they compute a **commitment** (the only thing that goes on-chain)

> 🚨 Double-check that your circuit and front-end use the **same Noir and bb versions.**
> Mismatches will cause errors.
> In our `nextjs/package.json`, you’ll see:
> `"@aztec/bb.js": "0.82.0"` and `"@noir-lang/noir_js": "1.0.0-beta.3"`.
> These must align.

### 🛠 Set Up the Commitment Function

📁 Open **`packages/nextjs/app/voting/_challengeComponents/CreateCommitment.tsx`**.

The component is already written for you. Your task: implement the `generateCommitment` function.

Right now, it returns dummy values for `commitment`, `nullifier`, and `secret`.
Those placeholders must go — replace them with real logic!

> 💡 `Fr` is the **finite field type of BN254**, ensuring all numbers (like nullifiers and secrets) stay within the valid scalar field used by ZK circuits.

### Steps to Implement

1. **Uncomment the imports at the top**.
2. **Generate fresh values**: create a random `nullifier` and `secret` with `Fr.random()`.
   - Cast them into `string`, then into `BigInt`.
3. **Hash with Poseidon**: compute the `commitment` using Poseidon (2-input), in the exact order `[nullifier, secret]`.
   > This mirrors the same hashing logic you used in the circuit.
4. **Format for Solidity**: convert your `commitment` into a `bytes32` hex string.
   - Hint: use `ethers.toBeHex` + `ethers.zeroPadValue(..., 32)`.
5. **Return all three values**: `commitment`, `nullifier`, and `secret`.

> 🧠 **Key Reminder**:
> The **commitment** is public, but your **nullifier** and **secret** are private.
> They’re the keys to proving your right to vote.
> We’ll store them in local storage here so you can reuse them later for proof generation.
> ⚠️ If they leak, someone else could vote on your behalf!

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>❓ Question 1</summary>

How can you use `Fr.random()` to generate values that stay inside the BN254 field,
and why do you need to cast them to `BigInt` before further use?

</details>

<details>
<summary>❓ Question 2</summary>

What happens if you swap the input order in Poseidon
(e.g., `[secret, nullifier]` instead of `[nullifier, secret]`)?

</details>

<details>
<summary>❓ Question 3</summary>

How will you ensure that your `commitment`, `nullifier`, and `secret`
are all formatted as valid **bytes32 hex strings** that Solidity will accept?

</details>

After thinking through the guiding questions, have a look at the solution code:

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```ts
const generateCommitment = async (): Promise<CommitmentData> => {
  ////// Checkpoint 7 //////
  const nullifier = BigInt(Fr.random().toString());
  const secret = BigInt(Fr.random().toString());
  const commitment = poseidon2([nullifier, secret]);

  const commitmentHex = ethers.zeroPadValue(ethers.toBeHex(commitment), 32);
  const nullifierHex = ethers.zeroPadValue(ethers.toBeHex(nullifier), 32);
  const secretHex = ethers.zeroPadValue(ethers.toBeHex(secret), 32);

  return {
    commitment: commitmentHex,
    nullifier: nullifierHex,
    secret: secretHex,
  };
};
```

</details>
</details>

### **✅ Implemented?! Great job!**

Head over to [localhost:3000](http://localhost:3000/) and add yourself to the **allowlist**.
Then go ahead and register.

If everything went smoothly, you should now see:

![registered-zk](./packages/nextjs/public/registered-zk.png)

> 🎉 Now your secret and nullifier are hidden in the smart contract's Merkle root.
> Only you know them — or better, your browser does 🙂 (they’re stored in local storage)!

> 🚨 Each time you restart your local chain with `yarn chain`, scroll down to the bottom of the **Voting** page and hit **Clear Local Storage**.
> Otherwise, since the contracts reuse the same addresses, the front-end will mistakenly think you’ve already created a commitment for that contract.

> 💡 You can inspect the commitment saved in **localStorage**.
> Just scroll to the bottom of the page and click **Log Local Storage**.

![loglocalstorage-zk](./packages/nextjs/public/loglocalstorage-zk.png)

### **🥅 Goals**

- [ ] Learn how to format values into the correct types expected by the verifier contract
- [ ] Understand how to perform hashing with Poseidon in TypeScript

## Checkpoint 8: 🔏 Generate Your Proof

You’ve created your **commitment** and registered successfully.

Now comes the magic moment: **creating the proof** that you’re in the Merkle tree.

This step is all about producing a **zero-knowledge proof** that says:

> “I’m registered, I know my nullifier + secret, and therefore I can show my membership in the tree.”

### 🛠 Set Up the Proof Generation Function

📁 Open **`packages/nextjs/app/voting/_challengeComponents/GenerateProof.tsx`**.

> 💡 In this step we create **two proofs**:
>
> 1. **Merkle inclusion proof** (to gather the siblings we need),
> 2. **ZK proof** that gets sent to the Solidity verifier.
>
> The Merkle proof is like a little trick, it supplies the path, and the ZK proof wraps this together with nullifier, secret, and vote.

🎯 Your goal: finish the `generateProof` function. The rest is already in place.

1. **Uncomment imports**
2. **Remove the `void` + return statement** and start implementing
3. **Compute the `nullifierHash`** (Hint: `poseidon1`)
4. **Rebuild the Merkle tree**
   - Initialize a new tree with Poseidon2 hashing (Hint: `new LeanIMT`)
   - Extract values from events → `_leaves` is an array of contract events. Each event holds a `value` (the on-chain commitment). The `map` pulls out just those values into a clean array `leaves`.
   - **Reverse the order** → Events are emitted newest-last, but our Merkle tree builds from **oldest-first**. Reversing ensures the tree is reconstructed correctly.
   - Insert into `LeanIMT` to reconstruct the exact tree state (Hint: `.insertMany()`)
     > 💡 We imported the same `zk-kit/lean-imt` library, but this time for **TypeScript**.

5. **Create Merkle tree inclusion proof**
   - Call `.generateProof(_index)` on the `calculatedTree`.
   - From the result, access `.siblings` and turn it into an array.
   - Add `"0"` placeholders so the siblings array always has the fixed length expected by the circuit (16).

6. **Prepare circuit inputs (`input`)**
   - Ensure all values are in the same order as in your circuit.
   - Convert everything into strings (siblings should be a string array).

7. **Create the witness**
   - Initialize Noir circuit instance: `const noir = new Noir(_circuitData);`. This loads your compiled ZK circuit into JavaScript so you can run it.
   - Run: `const witness = await noir.execute(input);`. This returns the **witness**.
   - Use `console.log` if you want to inspect how it looks.

8. **Generate the ZK proof**
   - Initialize the proving backend: `const honk = new UltraHonkBackend(_circuitData.bytecode, { threads: 1 });`
   - Generate the proof: `honk.generateProof(witness, {keccak: true});`. This takes the witness from Noir and produces the actual **ZK proof** plus its **public inputs**, using Keccak hashing for consistency with the verifier.
   - For debugging, you can `console.log` your proof (make sure the silence logs around the .`generateProof`, temporarily override)

   > 💡 The **UltraHonk backend** is the proving engine that takes your circuit’s bytecode + witness to generate the zero-knowledge proof.
   > It produces the same format your Solidity verifier expects.
   > The `threads` option controls how many CPU cores are used (`1` is enough, more threads = faster).

9. **Format the result for Solidity**
   - Encode `[proof, publicInputs]` with `ethers.AbiCoder`.
   - (Hint: check your **`Voting.sol`** contract for the expected format.)

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>❓ Question 1</summary>

How will you compute `nullifierHash` with `poseidon1`,
and what input format must `_nullifier` be in?
_(Hint: `BigInt`)_

</details>

<details>
<summary>❓ Question 2</summary>

Events are emitted newest-last on chain.
How will you transform `_leaves` so the IMT receives them **oldest-first**?

</details>

<details>
<summary>❓ Question 3</summary>

How do you make sure your siblings array has a length of 16?

</details>

<details>
<summary>❓ Question 4</summary>

In what exact order and types does your circuit declare inputs?

</details>

After thinking through the guiding questions, have a look at the solution code:

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```ts
import { UltraHonkBackend } from "@aztec/bb.js";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";
import { LeanIMT } from "@zk-kit/lean-imt";
import { ethers } from "ethers";
import { poseidon1, poseidon2 } from "poseidon-lite";

const generateProof = async (
  _root: bigint,
  _vote: boolean,
  _depth: number,
  _nullifier: string,
  _secret: string,
  _index: number,
  _leaves: any[],
  _circuitData: any,
) => {
  //// Checkpoint 8 //////
  const nullifierHash = poseidon1([BigInt(_nullifier)]);
  const calculatedTree = new LeanIMT((a: bigint, b: bigint) => poseidon2([a, b]));
  const leaves = _leaves.map(event => {
    return event?.args.value;
  });
  const leavesReversed = leaves.reverse();
  calculatedTree.insertMany(leavesReversed as bigint[]);
  const calculatedProof = calculatedTree.generateProof(_index);
  const sibs = calculatedProof.siblings.map(sib => {
    return sib.toString();
  });

  const lengthDiff = 16 - sibs.length;
  for (let i = 0; i < lengthDiff; i++) {
    sibs.push("0");
  }
  const input = {
    nullifier_hash: nullifierHash.toString(),
    nullifier: BigInt(_nullifier).toString(),
    secret: BigInt(_secret).toString(),
    root: _root.toString(),
    vote: _vote,
    depth: _depth.toString(),
    index: _index.toString(),
    siblings: sibs,
  };
  try {
    const noir = new Noir(_circuitData);
    const { witness } = await noir.execute(input);
    console.log("witness", witness);
    const honk = new UltraHonkBackend(_circuitData.bytecode, { threads: 1 });
    const originalLog = console.log;
    console.log = () => {};
    const { proof, publicInputs } = await honk.generateProof(witness, {
      keccak: true,
    });
    console.log = originalLog;
    console.log("proof", proof);
    const result = ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "bytes32[]"], [proof, publicInputs]);
    console.log("result", result);
    return { proof, publicInputs };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
```

</details>
</details>

### **✅ Implemented?! Well done!**

Fire up [localhost:3000](http://localhost:3000/), pick your voting option, and hit **Generate Proof**.

![generateproof-zk](./packages/nextjs/public/generateproof-zk.png)

Once the proof is created, the button will update to show **Proof already exists**.

![proofgenerated-zk](./packages/nextjs/public/proofgenerated-zk.png)

If you added a console log pattern, check the console to see how a proof looks.
Otherwise, you can also log your **localStorage** by pressing the **Log Local Storage** button at the bottom of the page — it will also show you how a proof looks.

👉 If you added a `console.log`, check your dev console to see the raw proof output.
👉 Alternatively, scroll to the bottom of the page and click **Log Local Storage** to print out the proof data saved in your browser.

### **🥅 Goals**

- [ ] Rebuild the Merkle tree and generate the siblings proof
- [ ] Format inputs correctly for the circuit
- [ ] Generate a valid ZK proof with Noir + UltraHonk

## Checkpoint 9: 🔥 Create a Burner Wallet on Hardhat to Send Your Vote

You’ve got your **ZK proof** ready — now it’s time to actually **cast your vote**.

But ⚠️ here’s the catch: if you use the **same address** you registered with, everyone can see on-chain which address voted and how they voted.
That would undo all the effort we just put into Noir, Merkle trees, and proof generation.

So instead, we’ll **send the vote from a fresh burner wallet,** an address that has **no link** to your registration wallet or any past transactions.
That way, only the proof ties you to your vote, nothing else.

> 🧠💡 The key idea: break the link between **registration address** and **voting address**.
> The **proof** is the only bridge, and only you know it, preserving your privacy.

### 🛠 Set Up the Burner Wallet Voting

📁 Open **`packages/nextjs/app/voting/_components/VoteWithBurnerHardhat.tsx`**

> 💡 Remove the placeholders and implement the logic below.

You’ll be working in two functions:

- `generateBurnerWallet`
- `sendVoteWithBurner`

### 1. **Generate a fresh burner wallet**

- In `generateBurnerWallet`, create a brand-new wallet.
- Use **ethers.js** to generate this new keypair.

### 2. **Fund the burner (local Hardhat only)**

- Inside `sendVoteWithBurner`, fund your wallet within the **local Hardhat environment**.
- Send ETH from the first signer account so the burner has enough gas to vote.

### 3. **Call the vote function**

- With the burner funded, call the `vote` function on your **Voting.sol** contract.
- Pass in both the **proof** and the **public inputs**.
- Retrieve them directly from `proofData` in **localStorage**.
- Format the proof correctly (Hint: `uint8[]`, you can use the helper function `uint8ArrayToHexString`).
- Ensure the **public inputs** are passed in the **exact order** the circuit expects.

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>❓ Question 1</summary>

How do you generate a fresh wallet using **ethers**?

</details>

<details>
<summary>❓ Question 2</summary>

How can you access the **first signer** from the Hardhat environment with ethers?

</details>

<details>
<summary>❓ Question 3</summary>

Where in **localStorage** can you find `proofData`, and how do you access it in your code?

</details>

<details>
<summary>❓ Question 4</summary>

How do you ensure the **public inputs** are passed in the exact order the circuit expects?
_(Hint: not much to do 🙂)_

</details>

After thinking through the guiding questions, have a look at the solution code:

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```ts
const sendVoteWithBurner = async ({
  contract,
  provider,
  walletAddress,
  proofData,
}: {
  contract: Contract;
  provider: JsonRpcProvider;
  walletAddress: string;
  proofData: LocalProofData;
}): Promise<string> => {
  ////// Checkpoint 9 //////
  const needed = parseEther("0.01");
  const bal = await provider.getBalance(walletAddress);
  if (bal < needed) {
    const signer = await provider.getSigner();
    await signer.sendTransaction({ to: walletAddress, value: needed - bal });
  }

  const tx = await contract.vote(
    uint8ArrayToHexString(proofData.proof),
    proofData.publicInputs[0],
    proofData.publicInputs[1],
    proofData.publicInputs[2],
    proofData.publicInputs[3],
  );
  return (await tx.wait())?.hash ?? tx.hash;
};

const generateBurnerWallet = () => {
  ////// Checkpoint 9 //////
  const wallet = Wallet.createRandom();
  setBurnerWallet(wallet);

  const effectiveContractAddress = contractAddress || contractInfo?.address;
  if (effectiveContractAddress && userAddress) {
    saveBurnerWalletToLocalStorage(wallet.privateKey, wallet.address, effectiveContractAddress, userAddress);
  }

  return wallet;
};
```

</details>
</details>

### **🎉 Implemented?! Let’s Vote!**

Let’s click **Vote** and send your vote out.
Your voting decision was already defined when you created the proof — it’s bound to that proof, so no one can front-run or alter it.

Click **Vote** and cast your ballot.

![voted-zk](./packages/nextjs/public/voted-zk.png)

If everything went well, you should now see your vote counted (in this example: **Yes = 1**).

![votingstats-zk](./packages/nextjs/public/votingstats-zk.png)

🎊 Congrats, you’ve just cast a **private vote**!

### **🥅 Goals**

- [ ] Create and fund a **burner wallet** with ethers
- [ ] Use it to **submit your vote** with proof + public inputs
- [ ] Understand why a burner wallet is needed

## Checkpoint 10: 🌍 Prepare to Vote on a Real Network

You proved inclusion and voted locally. Now let’s make it **real**:
Send the same privacy-preserving vote on the **Sepolia testnet**.

Here it gets a bit trickier to fund the account with a neutral address that isn’t linked to you.
That’s why we use **ERC-4337 (Account Abstraction)** with a verifying paymaster to cover gas costs.

> 💡 To keep things simple, we’re using **Pimlico**, a third-party ERC-4337 provider.
> It handles your **UserOperations** through a bundler and covers gas with a paymaster.
> Setup in TypeScript is straightforward.

> 🚨 First, sign up at Pimlico, [grab your API key](https://dashboard.pimlico.io/),
> and drop it into your **.env** file.
> On Sepolia, you can use it for free.

You’ll be working in two functions:

- `createSmartAccount`
- `voteOnSepolia`

📁 Open **`packages/nextjs/app/voting/_components/VoteWithBurnerSepolia.tsx`**

### 🛠 Create the Smart Account Wallet

1. Generate a **new private key and wallet** (fresh, never used).

2. Set up a **public client** connected to Sepolia.

3. Use `toSafeSmartAccount` from the **permissionless** library to create your smart account.

```ts
const account = await toSafeSmartAccount({
  client: publicClient,
  owners: [wallet],
  version: "1.4.1",
});
```

4. Build a smartAccountClient with createSmartAccountClient, this is what you’ll use later to send your vote.

```ts
const smartAccountClient = createSmartAccountClient({
  account,
  chain: CHAIN_USED,
  bundlerTransport: http(pimlicoUrl),
  paymaster: pimlicoClient,
  userOperation: {
    estimateFeesPerGas: async () => {
      return (await pimlicoClient.getUserOperationGasPrice()).fast;
    },
  },
});
```

5. Finally return `smartAccountClient`, `smartAccount`, `walletOwner`

### 🛠 Cast the Vote

1. Before sending the transaction to the bundler, first **build the calldata** using viem’s `encodeFunctionData` (with the same args as in the previous checkpoint).

2. Next, use your **smartAccountClient** to send the transaction with `.sendTransaction` and capture the resulting **UserOpHash**.

3. Finally, return this hash.

<details>
<summary>🦉 Guiding Questions</summary>

<details>
<summary>Question 1</summary>
How do you generate a **brand-new private key and wallet** in your setup so it’s never linked to your registration address?
</details>

<details>
<summary>Question 2</summary>
What role does the **Safe smart account** (via `toSafeSmartAccount`) play compared to a normal EOA?
</details>

<details>
<summary>Question 3</summary>
Why do we need a **bundler** and a **paymaster** when sending the transaction on Sepolia, instead of just sending it directly?
</details>

<details>
<summary>Question 4</summary>
Once you send the transaction, where can you look up the **UserOpHash** to confirm that your vote was included on-chain?
</details>

After thinking through the guiding questions, have a look at the solution code!

<details>
<summary>👩🏽‍🏫 Solution Code</summary>

```ts
const createSmartAccount = async (): Promise<{
  smartAccountClient: any;
  smartAccount: `0x${string}`;
  walletOwner: `0x${string}`;
}> => {
  try {
    //// Checkpoint 10 //////
    const privateKey = generatePrivateKey();
    const wallet = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({
      chain: CHAIN_USED,
      transport: http(RPC_URL),
    });
    const account = await toSafeSmartAccount({
      client: publicClient,
      owners: [wallet],
      version: "1.4.1",
    });
    const smartAccountClient = createSmartAccountClient({
      account,
      chain: CHAIN_USED,
      bundlerTransport: http(pimlicoUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
      },
    });
    return {
      smartAccountClient,
      smartAccount: account.address as `0x${string}`,
      walletOwner: wallet.address as `0x${string}`,
    };
  } catch (error) {
    console.error("Error creating smart account:", error);
    throw error;
  }
};

const voteOnSepolia = async ({
  proofData,
  contractInfo,
  contractAddress,
  smartAccountClient,
}: {
  proofData: any;
  contractInfo: any;
  contractAddress: any;
  smartAccountClient: any;
}): Promise<{ userOpHash: `0x${string}` }> => {
  if (!contractInfo && !contractAddress) throw new Error("Contract not found");
  //// Checkpoint 10 //////
  const callData = encodeFunctionData({
    abi: (contractInfo?.abi as any) || ([] as any),
    functionName: "vote",
    args: [
      toHex(proofData.proof),
      proofData.publicInputs[0], // _root
      proofData.publicInputs[1], // _nullifierHash
      proofData.publicInputs[2], // _vote
      proofData.publicInputs[3], // _depth
    ],
  });

  const userOpHash = await smartAccountClient.sendTransaction({
    to: (contractAddress || contractInfo?.address) as `0x${string}`,
    data: callData,
    value: 0n,
  });

  return { userOpHash };
};
```

</details>

</details>

### 🚀 Checkpoint Accomplished!

Great work! Now head to the **next checkpoint** where we’ll deploy everything to Sepolia and finally cast your vote **on-chain for real**.

### **🥅 Goals**

- [ ] Learn how to set up a **smart account** with ERC-4337 (via Pimlico)
- [ ] Use a **bundler + paymaster** (via Pimlico) to send a sponsored transaction

## **Checkpoint 11: 💾 Deploy your contracts and vote on Sepolia! 🛰**

🔐 You will need to generate a **deployer address** using `yarn generate`. his creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your wallet, or obtain it from a public faucet of your chosen network.

> 🚨 Don’t forget to set the owner address inside the 00_deploy_your_voting_contract.ts .

🚀 Run `yarn deploy --network sepolia` to deploy your smart contract to Sepolia.

> 💬 Hint: You can set the defaultNetwork in hardhat.config.ts to sepolia OR you can yarn deploy --network sepolia.

💻 Inside `scaffold.config.ts` change the `targetNetwork` to `chains.sepolia`. View your front-end at http://localhost:3000 and verify you see the correct network Sepolia.

📦 Run `yarn vercel` to package up your front-end and deploy.

> You might need to log in to Vercel first by running:
> `yarn vercel:login`. Once you log in (via email, GitHub, etc.), the default options should work.
> If you want to redeploy to the same production URL: `yarn vercel --prod`. If you omit the `--prod` flag it will deploy to a preview/test URL. Follow the steps to deploy to Vercel — you’ll get a **public URL**.

### **Configuration of Third-Party Services for Production-Grade Apps**

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as **Alchemy** and **Etherscan**.
This makes it easy to start building and complete your **SpeedRunEthereum** without additional setup.

For **production-grade apps**, you should generate your own API keys to avoid hitting rate limits. Configure them here:

- 🔷 **`ALCHEMY_API_KEY`** in `packages/hardhat/.env` and `packages/nextjs/.env.local` → [Get key from Alchemy](https://dashboard.alchemy.com/)
- 🔑 **`NEXT_PUBLIC_PIMLICO_API_KEY`** in `packages/nextjs/.env.local` → [Get key from Pimlico](https://dashboard.pimlico.io/)
- 📃 **`ETHERSCAN_API_KEY`** in `packages/hardhat/.env` → [Get key from Etherscan](https://etherscan.io/myapikey)

> 💬 Hint: Store environment variables for **Next.js** in Vercel/system env config for live apps, and use `.env.local` for local testing.

### 🚀 🔥 Challenge Conquered!

Now vote! Register yourself, create the proof, and hit the **Vote** button.

![sepoliavote-zk](./packages/nextjs/public/sepoliavote-zk.png)

**🎉 Congrats!** You’ve just pulled it off — an entire **privacy-preserving voting app** running fully on-chain.

Take a moment to celebrate, this is big! 🥳 Give yourself a pat on the back (or two 👏👏).

## Checkpoint 12: 🧠🍔 Final Considerations & Food for Thought

You now have a **working ZK voting dApp,** a big milestone! 🚀

This last checkpoint isn’t about more code, but about **thinking like a builder shipping to production**.

### ⚠️ Root history matters

- Using only the **latest root** works for demos, but in production it causes **stale proof failures**:
  a user generates a proof → another registers → the root changes → their vote reverts.
- **Fix:** keep a **ring buffer of recent roots** (e.g., last 30–100). New roots overwrite the oldest.
- When verifying, accept proofs against **any root in history**.
- **Benefit:** fewer failed txs, smoother UX, resilience against congestion.
- **Trade-off:** slightly higher storage/gas costs, but worth it for reliability.

### 🔐 Privacy depends on people

- In ZK systems, your privacy comes from the **anonymity set** → the group of all participants you could plausibly be.
- With only **1–2 voters**, it’s trivial to guess who voted what. True privacy emerges only as more commitments join the set.
- **Larger set = stronger privacy.** Observers can’t tell which registered user cast a given vote.
- Good UX: show **current anonymity set size** (e.g., “12 registered voters”) so participants understand their privacy.
- Some apps even enforce a **minimum set size** before voting begins.

### 🗳 Registration strategy

- In production, define a clear **registration period before voting starts**.
- If users can register + vote immediately, observers may correlate actions, especially with low participation.
- A dedicated registration window lets commitments accumulate → stronger anonymity set.
- Once registration ends, voting opens → privacy improves since votes can’t be tied to registration timing.

### 🛠 Indexing is key

- For demos, rebuilding the Merkle tree in-browser works, but it’s slow/unreliable.
- In production, run a dedicated **indexer**:
  - Listen to contract events
  - Rebuild the tree off-chain
  - Store roots + siblings
- Benefits:
  - No heavy browser computations
  - Correct data even during reorgs
  - Faster, smoother UX + single trusted source of truth

### ⛽️ Gas sponsorship

- In this challenge, **Pimlico** made gasless voting easy.
- In production, consider running **your own verifying paymaster**:
  - Define rules → per-poll budgets, rate limits, or policies
  - Avoid reliance on third parties
  - Full visibility into costs
- Result: **customizable, reliable, decentralized gas sponsorship**.

### 🌱 Beyond voting

The same **commitment + nullifier** pattern powers other privacy apps:

- Mixers (unlink deposits/withdrawals)
- Shielded ERC-20 transfers
- Private allowlists & attestations
- Quadratic or weighted voting

### 🚀 Where You Go From Here

You now understand the **core mechanics of ZK voting**:

✔ Commitments & nullifiers
✔ Merkle proofs & trees
✔ Noir circuits & constraints
✔ Solidity verifiers
✔ Anonymous vote casting

But this is just the beginning. Noir enables powerful circuit design:

- Mixers
- Shielded ERC-20 transfers
- Quadratic voting
- New governance models

This challenge is your **entry point into a new design space.** 💥

**What will you build with Noir and ZK circuits? 🧪✨**
