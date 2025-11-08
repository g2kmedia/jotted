"use client"

import { Check } from "lucide-react";

export default function Task() {
    return (
        <section>
            <div className="flex p-2">
                <input
                    type="text"
                    defaultValue="tbd tags"
                    placeholder="add tags..."
                    className="w-full text-right font-light text-muted-foreground outline-hidden peer"
                />
                <button className="w-0 peer-focus:w-auto peer-focus:px-2 opacity-0 peer-focus:opacity-100 overflow-hidden transition-opacity cursor-pointer hover:text-accent">
                    <Check />
                </button>
            </div>
            <fieldset className="p-2 flex flex-col">
                <label htmlFor="title"></label>
                <input
                    id="title"
                    type="text"
                    placeholder="Title"
                    className="w-full my-2 p-2 border rounded-2xl outline-none"
                />

                <label htmlFor="description"></label>
                <textarea
                    id="description"
                    placeholder="Description"
                    className="h-20 w-full my-2 p-2 border rounded-2xl resize-none outline-none"
                />

                <fieldset className="my-2 grid grid-cols-2 justify-items-center">
                    <label htmlFor="date">Date</label>
                    <label htmlFor="time">Time</label>

                    <input
                        id="date"
                        type="date"
                        className="w-40 my-2 p-2 text-center border rounded-2xl outline-none"
                    />

                    <input
                        id="time"
                        type="time"
                        className="w-40 my-2 p-2 text-center border rounded-2xl outline-none"
                    />
                </fieldset>

                <label htmlFor="priority" className="w-full my-2 text-center">Priority</label>
                <select
                    name="priority"
                    id="priority"
                    className="w-40 self-center text-center p-2 border rounded-2xl"
                >
                    <option value="0">-</option>
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                </select>
            </fieldset>
        </section>
    );
}