import { Inter } from "@next/font/google";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ChangeEvent, useState } from "react";
import { Show } from "../types";
import { Answer } from "../components/Answer";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState("");
    const [matches, setMatches] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const askgpt = async () => {
        setIsLoading(true);
        setError("");
        setMatches([]);

        // first get matched shows based on query
        const choices = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });
        if (!choices.ok) {
            setError("Unable to perform the search: " + choices.statusText);
        }

        // construct the context
        const choicesJson = await choices.json();
        const chosenShows = choicesJson.map(
            (c: Show) => `Show Title: '${c.show_title}'. Show Description: '${c.show_description}'.`
        );
        setMatches(choicesJson);

        // ask gpt for the answer
        const answer = await fetch("/api/askgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, context: chosenShows }),
        });
        if (!answer.ok) {
            setError("Unable to get the answer: " + answer.statusText);
        }

        const data = answer.body;
        if (!data) {
            setError("Response stream not available");
            return;
        }

        // read the response stream
        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;

        setIsLoading(false);
        setAnswer("");

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);

            setAnswer((prev) => prev + chunkValue);
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

                {answer && (
                    <div className="relative mt-6 w-full">
                        <div
                            className={`w-full flex-1 items-center rounded-lg border px-4 py-4 shadow-md ${
                                isLoading && "opacity-25"
                            }`}
                        >
                            <h2 className="mb-4 text-2xl font-semibold">Answer</h2>
                            <Answer text={answer} />
                        </div>
                        {isLoading && (
                            <div className="absolute left-1/2 top-20 -translate-x-1/2 -translate-y-1/2 animate-pulse text-3xl md:top-1/2 md:text-5xl">
                                Searching...
                            </div>
                        )}
                    </div>
                )}

                {matches && matches.length > 0 && (
                    <div className="relative mt-6 w-full">
                        <div className="w-full gap-4 rounded-lg border px-4 py-4 shadow-md">
                            <h2 className="mb-4 text-left text-2xl font-semibold">Matches</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {matches.map((m) => {
                                    return (
                                        <div>
                                            <span className="font-semibold">{m.show_title}</span> -{" "}
                                            {m.show_description}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
