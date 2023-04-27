import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";

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
        match_count: 15,
    });
    if (rpcError) {
        console.log("Error in finding matching embedding");
        throw rpcError;
    }

    return rpcData;
}

async function askGpt(given: string, asked: string) {
    const prompt = `You are an enthusiastic representative of a Netflix shows collection database who loves to help people! Given the following titles and descriptions of available shows provided as context, help the user find a few shows that they might be looking for based on the description that they provide. If you are unsure and the answer is not explicity available in the shows descriptions provided to you then say, "Sorry unable to help". In your response, be friendly and provide the answer with your reasoning on why you suggested these shows. Format your response in an ordererd HTML list and apply font-semibold css class to the name of the show.

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
        max_tokens: 2500,
        temperature: 0.5,
    });

    console.log(answer.data);
    return answer.data;
}

export default async function (req: NextApiRequest, res: NextApiResponse) {
    if (!configuration.apiKey) {
        res.status(500).json({
            error: {
                message: "OpenAI API key not configured, please follow instructions in README.md",
            },
        });
        return;
    }

    const query = req.body.query;

    try {
        const response = await findMatchingEmbeddings(query);
        const shows: string[] = [];
        for (const r of response) {
            shows.push(`Show Title: "${r.show_title}" Show Description: "${r.show_description}"`);
        }

        const answer = await askGpt(shows.join(", "), query);
        const choices = answer.choices.map((c) => c.text);

        res.status(200).json({ id: answer.id, context: shows, choices: choices });
    } catch (error: any) {
        console.error(`error in askgpt: ${error.message}`);
        res.status(500).json({
            error: {
                message: error.message,
            },
        });
    }
}
