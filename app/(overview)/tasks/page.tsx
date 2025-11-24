"use client"

import Link from "next/link";
import { Circle } from 'lucide-react';

export default function Notes() {
  const completeTask = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    // button logic here
  }

  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-2 text-xl">
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>Today</span>
          <span>2</span>
        </button>
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>This week</span>
          <span>4</span>
        </button>
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>Scheduled</span>
          <span>5</span>
        </button>
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>Later</span>
          <span>23</span>
        </button>
      </section>
      <section className="mb-6">
        <button className="p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer">#tag 1</button>
        <button className="p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer">#tag 2</button>
        <button className="p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer">#tag 3</button>
        <button className="p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer">#tag 4</button>
      </section>
      <section>
        <Link href="something" key="something">
          <article className="grid grid-cols-[auto_1fr] gap-4 h-22 mb-2 p-4 border-1 border-foreground rounded-lg">
            <button onClick={completeTask} className="self-center"><Circle /></button>
            <div>
              <h3 className="text-lg mb-1">Task Title</h3>
              <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <li key="something" className="pl-2">#tag</li>
              </ul>
            </div>
          </article>
        </Link>
      </section>
    </>
  );
}