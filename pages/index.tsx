import { Inter } from "@next/font/google";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ChangeEvent, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Configuration, OpenAIApi } from "openai";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ __html: "" });
    const [context, setContext] = useState([""]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showContext, setShowContext] = useState(false);

    // configure openai
    const configuration = new Configuration({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
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

        const { error: rpcError, data: rpcData } = await supabase.rpc(
            "match_netflix_titles_descr",
            {
                embeddings: embedding,
                match_threshold: 0.78,
                match_count: 15,
            }
        );
        if (rpcError) {
            console.log("Error in finding matching embedding");
            throw rpcError;
        }

        return rpcData;
    }

    async function askGpt(given: string, asked: string) {
        const prompt = `You are an enthusiastic representative of a Netflix shows collection database who loves to help people! Your name is Netflix man. Given the following titles and descriptions of available shows provided as context, help the user find a few shows that they might be looking for based on the description that they provide. If you are unsure and the answer is not explicity available in the shows descriptions provided to you then say, "Sorry unable to help". In your response, be friendly, introduce yourself, and provide the answer with the reasoning on why you suggested these shows. Format your response in an unordererd HTML list and apply font-semibold css class to the name of the show.
    
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

    const askgpt = async () => {
        // setResults({ __html: "" });
        setIsLoading(true);
        setError("");

        try {
            // look for embeddings to match with the query
            const response = await findMatchingEmbeddings(query);
            const shows: string[] = [];
            for (const r of response) {
                shows.push(
                    `Show Title: "${r.show_title}" Show Description: "${r.show_description}"`
                );
            }

            // ask gpt for answer
            const answer = await askGpt(shows.join(", "), query);
            const choices = answer.choices.map((c) => c.text);

            console.log(shows, choices);

            // show the results
            setResults({ __html: choices.join(" ") });
            setContext(shows);
        } catch (e: any) {
            console.log("something went wrong", e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="container relative mx-auto max-w-5xl p-6">
                <div className="rounded-lg bg-teal-700 p-4 text-center text-3xl text-white shadow-md">
                    <div>Netflix Shows Finder</div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center rounded-lg border px-4 py-2 shadow-md">
                        <MagnifyingGlassIcon className="inline h-6 fill-current text-gray-600" />
                        <input
                            type="text"
                            value={query}
                            className="ml-2 w-full appearance-none border-0 p-2 text-xl text-gray-600 focus:outline-none focus:ring-0 md:p-4 md:text-2xl"
                            placeholder="Find a show by providing some description"
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setQuery(e.currentTarget.value)
                            }
                        />
                        <button onClick={() => setQuery("")}>
                            <XMarkIcon className="inline h-6 fill-current text-gray-600 md:mr-4" />
                        </button>
                        <button
                            className="hidden w-40 rounded-lg bg-teal-600 px-4 py-2 text-base font-semibold leading-7 text-white shadow-sm ring-1 ring-teal-600 hover:bg-teal-700 hover:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-50 md:block"
                            onClick={askgpt}
                            disabled={isLoading}
                        >
                            Search
                        </button>
                    </div>
                    <button
                        className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-2 text-base font-semibold leading-7 text-white shadow-sm ring-1 ring-teal-600 hover:bg-teal-700 hover:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
                        onClick={askgpt}
                        disabled={isLoading}
                    >
                        Search
                    </button>
                </div>

                {error && <div className="mt-4 font-semibold text-red-600">{error}</div>}

                {results.__html && (
                    <div className="relative mt-6 w-full">
                        <div
                            className={`w-full flex-1 items-center rounded-lg border px-4 py-4 shadow-md ${
                                isLoading && "opacity-25"
                            }`}
                        >
                            <p
                                className="prose w-full md:text-xl"
                                dangerouslySetInnerHTML={results}
                            ></p>
                        </div>
                        {isLoading && (
                            <div className="absolute left-1/2 top-20 -translate-x-1/2 -translate-y-1/2 animate-pulse text-3xl md:top-1/2 md:text-5xl">
                                Searching...
                            </div>
                        )}
                        {/* <div className="mt-4">
                            <button
                                className="rounded-lg bg-teal-600 px-4 py-2 text-base font-semibold leading-7 text-white shadow-sm ring-1 ring-teal-600 hover:bg-teal-700 hover:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => {
                                    console.log(context);
                                    setShowContext(!showContext);
                                }}
                            >
                                Show Context
                            </button>
                        </div> */}
                    </div>
                )}

                {showContext && (
                    <div className="mt-6 rounded-lg border p-4 text-gray-800 shadow-sm">
                        <h2 className="mb-6 text-2xl">Context</h2>
                        {context.map((c: string) => {
                            const first = c
                                .split("Show Title: ")[1]
                                .split("Show Description: ")[0]
                                .replaceAll('"', "");
                            const second = c.split("Show Description: ")[1].replaceAll('"', "");
                            return (
                                <div className="mb-2 flex border-b">
                                    <div>
                                        <span className="font-semibold">{first}</span> - {second}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
