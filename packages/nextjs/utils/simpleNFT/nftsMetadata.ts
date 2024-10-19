const nftsMetadata = [
  {
    description: "El FOMO",
    external_url: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/", // <-- this can link to a page for the specific file too
    image: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/Dise%C3%B1o%20Loter%C3%ADa%20-%20v3_1.%20FOMITO_BLKA.png",
    name: "Fomito",
    attributes: [
      {
        trait_type: "BackgroundColor",
        value: "blue",
      },
      {
        trait_type: "Eyes",
        value: "FOMO",
      },
      {
        trait_type: "Stamina",
        value: 1,
      },
    ],
  },
  {
    description: "EL BASADO",
    external_url: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/", // <-- this can link to a page for the specific file too
    image: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/Dise%C3%B1o%20Loter%C3%ADa%20-%20v3_5.%20BASADO_BLKA.png",
    name: "EL BASADO",
    attributes: [
      {
        trait_type: "BackgroundColor",
        value: "blue",
      },
      {
        trait_type: "Eyes",
        value: "BASE",
      },
      {
        trait_type: "Stamina",
        value: 5,
      },
    ],
  },
  {
    description: "EL ARCO",
    external_url: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/", // <-- this can link to a page for the specific file too
    image: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/Dise%C3%B1o%20Loter%C3%ADa%20-%20v3_20.%20ARCO_BLKA.png",
    name: "Farecaster",
    attributes: [
      {
        trait_type: "BackgroundColor",
        value: "green",
      },
      {
        trait_type: "Eyes",
        value: "BASE",
      },
      {
        trait_type: "Stamina",
        value: 20,
      },
    ],
  },
  {
    description: "EL DEV",
    external_url: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/", // <-- this can link to a page for the specific file too
    image: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/Dise%C3%B1o%20Loter%C3%ADa%20-%20v3_11.%20DEV_BLKA.png",
    name: "DEV",
    attributes: [
      {
        trait_type: "BackgroundColor",
        value: "purple",
      },
      {
        trait_type: "Eyes",
        value: "WEB3",
      },
      {
        trait_type: "Stamina",
        value: 11,
      },
    ],
  },
  {
    description: "Coinbase.",
    external_url: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/", // <-- this can link to a page for the specific file too
    image: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/Dise%C3%B1o%20Loter%C3%ADa%20-%20v3_17.%20EXCHANGE_BLKA.png",
    name: "LA EXCHANGE",
    attributes: [
      {
        trait_type: "BackgroundColor",
        value: "blue",
      },
      {
        trait_type: "Eyes",
        value: "BASE",
      },
      {
        trait_type: "Stamina",
        value: 17,
      },
    ],
  },
  {
    description: "EL ESTAFADOR",
    external_url: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/", // <-- this can link to a page for the specific file too
    image: "https://ivory-past-penguin-650.mypinata.cloud/ipfs/QmZHFRCekacxKsRXheh7W9YJUcJzkpH61PUjnGFjBjxpeH/Dise%C3%B1o%20Loter%C3%ADa%20-%20v3_6.%20SHILLARDO_BLKA.png",
    name: "Godzilla",
    attributes: [
      {
        trait_type: "BackgroundColor",
        value: "orange",
      },
      {
        trait_type: "Eyes",
        value: "SCAM",
      },
      {
        trait_type: "Stamina",
        value: 6,
      },
    ],
  },
];

export type NFTMetaData = (typeof nftsMetadata)[number];

export default nftsMetadata;
