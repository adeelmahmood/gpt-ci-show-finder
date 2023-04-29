import { useEffect, useState } from "react";

interface AnswerProps {
    text: string;
}

export const Answer: React.FC<AnswerProps> = ({ text }) => {
    const [words, setWords] = useState<string[]>([]);

    useEffect(() => {
        if (text) {
            setWords(text.split(" "));
        }
    }, [text]);

    return <div className="prose w-full md:text-xl" dangerouslySetInnerHTML={{ __html: text }} />;
};
