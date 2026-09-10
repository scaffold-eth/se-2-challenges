const fetchFromApi = async ({ path, method, body }: { path: string; method: string; body?: object }) => {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Request failed: ${response.status}`);
  return data;
};

export const addToIPFS = (yourJSON: object) => fetchFromApi({ path: "/api/ipfs/add", method: "Post", body: yourJSON });

export const getMetadataFromIPFS = (ipfsHash: string) =>
  fetchFromApi({ path: "/api/ipfs/get-metadata", method: "Post", body: { ipfsHash } });
