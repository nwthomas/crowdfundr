# CROWDFUNDR

## TABLE OF CONTENTS

- [Description](#description)
- [Design Exercises](#design-exercises)

## DESCRIPTION

```
"Build a smart contract that allows creators to register their projects. Other people can contribute ETH to that project. Once the goal has been met, the creators can withdraw the funds. When someone contributes 1 ETH, they receive a contributor badge NFT, which is tradable."
```

Upon further examination, the following specifications were also revealed:

```
- The smart contract is reusable; multiple projects can be registered and accept ETH concurrently.
  - Specifically, you should use the factory contract pattern.
- The goal is a preset amount of ETH.
  - This cannot be changed after a project gets created.
- Regarding contributing:
  - The contribute amount must be at least 0.01 ETH.
  - There is no upper limit.
  - Anyone can contribute to the project, including the creator.
  - One address can contribute as many times as they like.
  - No one can withdraw their funds until the project either fails or gets cancelled.
- Regarding contributer badges:
  - An address receives a badge if their **total contribution** is at least 1 ETH.
  - One address can receive multiple badges, but should only receive 1 badge per 1 ETH.
- If the project is not fully funded within 30 days:
  - The project goal is considered to have failed.
  - No one can contribute anymore.
  - Supporters get their money back.
  - Contributor badges are left alone. They should still be tradable.
- Once a project becomes fully funded:
  - No one else can contribute (however, the last contribution can go over the goal).
  - The creator can withdraw any amount of contributed funds.
- The creator can choose to cancel their project before the 30 days are over, which has the same effect as a project failing.
```

## DESIGN EXERCISES

The question is:

```
Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?
```

Answer:

```
If we were to design around various contributions tiers and the associated NFTs that we'd need to store, one possibility around the 24kb limit for contracts could be to store a seperate value in the NFT metadata indicating which contribution tier the NFT was granted for.

We could then include a tokenURI function that would conditionally render certain attributes about the NFT depending on the metadata value. This would allow us to get around needing to have separate NFT contracts.
```
