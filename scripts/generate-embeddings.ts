import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

dotenv.config({ path: ".env.local" });

// configure openai
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// configure supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

const LOAD_COUNT = 1000;
const BATCH_SIZE = 100;

async function loadTitles() {
    console.log("Loading netflix titles from database");

    // read titles from database
    const { error, data } = await supabase.from("netflix_titles").select("*").limit(LOAD_COUNT);

    if (error) {
        console.error("Error in reading titles from database");
        throw error;
    }

    return data;
}

async function generateAndUpdateEmbeddings() {
    console.log("generating embeddings");
    let batch = [];

    const titles = await loadTitles();
    for (const title of titles) {
        // add to batch
        batch.push(title);

        // generate embeddings when batch is full
        if (batch.length >= BATCH_SIZE) {
            const batchDescrs = batch.map((b) => b.description);
            // console.log(
            //     `>> Ready to generate embeddings for the batch\n-------\n${batchDescrs.join(
            //         "\n"
            //     )}\n--------\n\n`
            // );

            // request embedding from openai
            const embeddings = await generateEmbeddingsInBatch(batchDescrs);

            // iterate over each embedding
            for (const embedding of embeddings) {
                // add embedding to the database
                const { error, data } = await supabase
                    .from("netflix_titles_descr_embeddings")
                    .insert({
                        description: batch[embedding.index].description,
                        embeddings: embedding.embedding,
                        show_id: batch[embedding.index].show_id,
                    });
                if (error) {
                    console.error("Error in adding embedding to database");
                    throw error;
                }
            }

            // empty the batch
            batch = [];
        }
    }
}

async function generateEmbeddingsInBatch(input: string[]) {
    const sanitizedInput: string[] = input;
    sanitizedInput.forEach((i) => i.trim());

    // request embeddings from openai
    const response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: sanitizedInput,
    });

    if (response.status != 200) {
        throw new Error("embedding request failed");
    }

    return response.data.data;
}

async function generateEmbedding(input: string) {
    const sanitizedInput = input.trim();

    // request embeddings from openai
    const response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: sanitizedInput,
    });

    if (response.status != 200) {
        throw new Error("embedding request failed");
    }

    const [responseData] = response.data.data;
    return responseData.embedding;
}

async function findMatchingEmbeddings(input: string) {
    const embedding = await generateEmbedding(input);

    const { error: rpcError, data: rpcData } = await supabase.rpc("match_netflix_titles_descr", {
        embeddings: embedding,
        match_threshold: 0.78,
        match_count: 10,
    });
    if (rpcError) {
        console.log("Error in finding matching embedding");
        throw rpcError;
    }

    return rpcData;
}

async function askGpt(given: string, asked: string) {
    const prompt = `You are an enthusiastic representative of a Netflix shows collection database who loves to help people! Given the following shows titles and descriptions provided as context, help the user find a few shows that they might be looking for based on the description that they provide. If you are unsure and the answer is not explicity available in the shows descriptions provided to you then say, "Sorry unable to help". Can you also explain to the user why you are recommending these shows. Format your response in HTML.

Context shows with titles and descriptions:
${given}

User Provided Description:
${asked}

Answer:
`;
    console.log(prompt);

    const answer = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        max_tokens: 2000,
        temperature: 0.5,
    });

    console.log(answer.data);
}

async function main() {
    // const query = "family problems";

    await generateAndUpdateEmbeddings();
    // const response = await findMatchingEmbeddings(query);
    // const shows: string[] = [];
    // for (const r of response) {
    //     shows.push(`Show Title: "${r.show_title}" Show Description: "${r.show_description}"`);
    // }

    // const answer = await askGpt(shows.join(", "), query);
    // console.log(answer);
}

main().catch((e) => {
    console.error(e);

    process.exit(1);
});
