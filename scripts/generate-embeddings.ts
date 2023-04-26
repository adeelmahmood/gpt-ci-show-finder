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

async function loadTitles() {
    console.log("Loading netflix titles from database");

    // read titles from database
    const { error, data } = await supabase.from("netflix_titles").select("*").limit(2);

    if (error) {
        console.error("Error in reading titles from database");
        throw error;
    }

    return data;
}

async function generateAndUpdateEmbeddings(updateEmbeddings: boolean = false) {
    console.log("generating embeddings");

    const titles = await loadTitles();
    for (const title of titles) {
        // request embedding from openai
        const embedding: number[] = await generateEmbedding(title.description);

        // add embedding to the database
        if (updateEmbeddings) {
            const { error, data } = await supabase.from("netflix_titles_descr_embeddings").insert({
                description: title.description,
                embeddings: embedding,
                show_id: title.show_id,
            });
            if (error) {
                console.error("Error in adding embedding to database");
                throw error;
            }
        }
    }
}

async function generateEmbedding(input: string | string[]) {
    const sanitizedInput: string[] = Array.isArray(input) ? input : [input];
    sanitizedInput.forEach((i) => i.trim());

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

function printEmbedding(embedding: number[], inFull: boolean = false) {
    if (inFull) {
        console.log(embedding);
    } else {
        console.log(`[${embedding[0]},${embedding[1]}...${embedding[embedding.length - 1]}]`);
    }
}

async function main() {
    const query = "family problems";

    // await generateEmbeddings(false);
    const response = await findMatchingEmbeddings(query);
    const shows: string[] = [];
    for (const r of response) {
        shows.push(`Show Title: "${r.show_title}" Show Description: "${r.show_description}"`);
    }

    const answer = await askGpt(shows.join(", "), query);
    console.log(answer);
}

main().catch((e) => {
    console.error(e);

    process.exit(1);
});
