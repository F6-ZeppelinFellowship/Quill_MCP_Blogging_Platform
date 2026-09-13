const ollamaUrl =
    process.env.OLLAMA_URL ??
    "http://localhost:11434";

const model =
    process.env.EMBEDDING_MODEL ??
    "all-minilm";

async function main(): Promise<void> {
    console.log("Ollama URL:", ollamaUrl);
    console.log("Embedding model:", model);

    const response = await fetch(
        `${ollamaUrl}/api/embed`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                input:
                    "Quill semantic vector search test.",
            }),
        },
    );

    if (!response.ok) {
        throw new Error(
            `Ollama returned ${response.status}: ` +
            await response.text(),
        );
    }

    const data =
        await response.json() as {
            embeddings?: number[][];
        };

    const embedding =
        data.embeddings?.[0];

    if (
        !embedding ||
        embedding.length === 0
    ) {
        throw new Error(
            "No embedding was returned.",
        );
    }

    console.log(
        "Embedding generated: OK",
    );

    console.log(
        "Vector dimensions:",
        embedding.length,
    );

    console.log(
        "Ollama verification: PASSED",
    );
}

main().catch((error) => {
    console.error(
        "Ollama verification: FAILED",
    );
    console.error(error);
    process.exit(1);
});
