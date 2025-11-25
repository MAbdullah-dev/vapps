"use client";

import { Search, Bell, Menu, Moon, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Topbar() {
    return (
        <header className="h-14 border-b bg-white px-4 flex items-center justify-between">
            {/* Left - Mobile menu button */}
            {/* <div className="md:hidden">
                <Button variant="ghost" size="icon">
                    <Menu size={20} />
                </Button>
            </div> */}

            {/* Center - Search */}
            <div className="flex-1 flex">
                <div className="relative w-full max-w-md">
                    <Search size={18} className="absolute top-3 left-3 text-gray-500" />
                    <Input
                        className="pl-10"
                        placeholder="Search tasks, docs, processes..."
                    />
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
                <Button variant="outline">Ask AI Assistant</Button>
                <Button variant="ghost" size="icon">
                    <Bell size={20} />
                </Button>
                <Button variant="ghost" size="icon">
                    <Moon size={20} />
                </Button>
                <Button variant="ghost" size="icon">
                     <Globe size={20} />
                </Button>
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
        </header>
    );
}
