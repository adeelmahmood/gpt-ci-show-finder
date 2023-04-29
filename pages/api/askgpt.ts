import { ParsedEvent, ReconnectInterval, createParser } from "eventsource-parser";
import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";

export const config = {
    runtime: "edge",
};

// configure openai
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function askGpt(given: string, asked: string) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const prompt = `You are an enthusiastic representative of a Netflix shows collection database who loves to help people! Your name is Netflix man. Given the following titles and descriptions of available shows provided as context, help the user find a few shows that they might be looking for based on the description that they provide. Provide the top 3 shows that match the best criteria based on the description. If you are unsure and the answer is not explicity available in the shows descriptions provided to you then say, "Sorry unable to help". In your response, be friendly, introduce yourself, and provide the answer with the reasoning on why you suggested these shows. Format your response in an unordererd HTML list and apply font-semibold css class to the name of the show.

Context shows with titles and descriptions:
${given}

User Provided Description:
${asked}

Answer:
`;

    const answer = await fetch("https://api.openai.com/v1/completions", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        method: "POST",
        body: JSON.stringify({
            model: "text-davinci-003",
            prompt,
            max_tokens: 2000,
            temperature: 0.5,
            stream: true,
        }),
    });

    if (answer.status !== 200) {
        throw new Error(`OpenAI API returned an error ${answer.status}`);
    }

    const stream = new ReadableStream({
        async start(controller) {
            const onParse = (event: ParsedEvent | ReconnectInterval) => {
                if (event.type === "event") {
                    const data = event.data;

                    if (data === "[DONE]") {
                        controller.close();
                        return;
                    }

                    try {
                        const json = JSON.parse(data);
                        const text = json.choices[0].text;
                        const queue = encoder.encode(text);
                        controller.enqueue(queue);
                    } catch (e: any) {
                        console.log("error in parsing stream response", e.message);
                        controller.error(e);
                    }
                }
            };

            const parser = createParser(onParse);

            for await (const chunk of answer.body as any) {
                parser.feed(decoder.decode(chunk));
            }
        },
    });

    return stream;
}

export default async function (req: Request, res: Response) {
    if (!configuration.apiKey) {
        return new Response("OpenAI key not provided", { status: 500 });
    }

    const { query, context } = (await req.json()) as {
        query: string;
        context: string;
    };

    try {
        const stream = await askGpt(context, query);
        return new Response(stream);
    } catch (e: any) {
        console.error(e);
        return new Response(e, { status: 500 });
    }
}
