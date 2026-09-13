import { QdrantClient } from "@qdrant/js-client-rest";

const url =
    process.env.QDRANT_URL ??
    "http://localhost:6333";

const collectionName =
    process.env.QDRANT_COLLECTION ??
    "quill_posts";

const client = new QdrantClient({
    url,
    apiKey:
        process.env.QDRANT_API_KEY ||
        undefined,
});

async function main(): Promise<void> {
    console.log("Qdrant URL:", url);
    console.log("Collection:", collectionName);

    try {
        const collections =
            await client.getCollections();

        console.log(
            "Qdrant connection: OK",
        );

        console.log(
            "Collections:",
            collections.collections.map(
                (collection) =>
                    collection.name,
            ),
        );

        try {
            await client.getCollection(
                collectionName,
            );

            console.log(
                `Collection "${collectionName}" exists.`,
            );
        } catch {
            await client.createCollection(
                collectionName,
                {
                    vectors: {
                        size: 384,
                        distance: "Cosine",
                    },
                },
            );

            console.log(
                `Created collection "${collectionName}".`,
            );
        }

        console.log(
            "Qdrant verification: PASSED",
        );
    } catch (error) {
        console.error(
            "Qdrant verification: FAILED",
        );
        console.error(error);
        process.exit(1);
    }
}

main();
