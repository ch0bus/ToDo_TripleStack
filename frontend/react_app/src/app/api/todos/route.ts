// app/api/todos/route.ts

import { NextResponse } from "next/server";

type Todo = {
    id: number;
    title: string;
    completed: boolean;
};

let todos: Todo[] = [];

export async function GET() {
    return NextResponse.json(todos);
}

export async function POST(req: Request) {
    const body = await req.json();
    const title = String(body.title ?? "").trim();

    if (!title) {
        return NextResponse.json(
            { error: "Title is required" },
            { status: 400 }
        );
    }

    const todo: Todo = {
        id: Date.now(),
        title,
        completed: false,
    };
    todos.push(todo);

    return NextResponse.json(todo, { status: 201 });
}

export async function PATCH(req: Request) {
      const body = await req.json();
      const id = Number(body.id);
      const completed = Boolean(body.completed);

      const todo = todos.find(t => t.id === id);
        if (!todo) {
            return NextResponse.json(
                { error: "Not found" },
                { status: 404 }
            );
        }

        todo.completed = completed;
        return NextResponse.json(todo);
}

export async function DELETE(req: Request) {
      const { searchParams } = new URL(req.url);
      const id = Number(searchParams.get("id"));

      const before = todos.length;
      todos = todos.filter(t => t.id !== id);

      if (todos.length === before) {
        return NextResponse.json(
            { error: "Not found" },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true });
}
