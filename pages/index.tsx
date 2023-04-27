import { Inter } from "@next/font/google";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ChangeEvent, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ __html: "" });
    const [context, setContext] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showContext, setShowContext] = useState(false);

    const askgpt = async () => {
        // setResults({ __html: "" });
        setIsLoading(true);

        const response = await fetch("/api/askgpt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();
        setIsLoading(false);

        if (response.status !== 200) {
            console.log(data.error);
        } else {
            setResults({ __html: data.choices[0] });
            setContext(data.context);
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
