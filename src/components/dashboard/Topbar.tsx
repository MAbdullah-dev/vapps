"use client";

import { Search, Bell, Check, Moon, Globe, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useState } from "react";
import { signOut } from "next-auth/react";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";



export default function Topbar() {
    const notificationCount = 3;
    const [selectedLang, setSelectedLang] = useState("English");

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/auth" });
    };

    return (
        <header className="h-14 border-b bg-[#FCFCFC] px-4 flex items-center justify-between">
            {/* Center - Search */}
            <div className="flex-1 flex">
                <div className="relative w-full max-w-md">
                    <Search size={18} className="absolute top-[50%] transform -translate-y-1/2 left-3 text-gray-500" />
                    <Input
                        className="pl-10 border-none bg-[#F3F3F5]"
                        placeholder="Search tasks, docs, processes..."
                    />
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
                <Button variant="outline">Ask AI Assistant</Button>

                {/* Notification Popover */}
                <Popover>
                    <PopoverTrigger className="relative p-2 rounded-full hover:bg-accent">
                        <Bell className="h-5 w-5" />

                        {notificationCount > 0 && (
                            <span
                                className="
                                    absolute -top-0.5 -right-0.5
                                    flex h-4 min-w-4 items-center justify-center
                                    rounded-full bg-black text-white 
                                    text-[10px] font-medium leading-none
                                "
                            >
                                {notificationCount}
                            </span>
                        )}
                    </PopoverTrigger>

                    <PopoverContent className="w-100 p-4 -translate-x-30 border border-[#0000001A] shadow-lg">
                        <h4 className="font-semibold text-base mb-2">Notifications</h4>
                        <div className="space-y-2">
                            <div className="p-4 rounded-xl flex flex-col gap-1.5 bg-[#F9FAFB]"><p className="text-[#0A0A0A] text-sm">Sarah closed Issue QA-12</p> <span className="text-xs text-[#6A7282]">2 minutes ago</span></div>
                            <div className="p-4 rounded-xl flex flex-col gap-1.5 bg-[#F9FAFB]"><p className="text-[#0A0A0A] text-sm">New audit assigned to you</p> <span className="text-xs text-[#6A7282]">5 minutes ago</span></div>
                            <div className="p-4 rounded-xl flex flex-col gap-1.5 bg-[#F9FAFB]"><p className="text-[#0A0A0A] text-sm">Document uploaded: Q4 Report</p> <span className="text-xs text-[#6A7282]">10 minutes ago</span></div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Language Selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative hover:bg-accent">
                            <Globe size={20} />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-lg shadow-md border bg-white"
                    >

                        {["English", "Spanish", "French", "German", "Hindi"].map((lang) => (
                            <DropdownMenuItem
                                key={lang}
                                onClick={() => setSelectedLang(lang)}
                                className="flex justify-between items-center cursor-pointer text-[#0A0A0A] text-sm"
                            >
                                {lang}

                                {selectedLang === lang && (
                                    <Check className="h-4 w-4 text-black" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>



                <Button variant="ghost" size="icon">
                    <Moon size={20} />
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 flex items-center justify-center"
                        >
                            <User className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-48 p-1">

                        <DropdownMenuItem>
                            Profile
                        </DropdownMenuItem>

                        <DropdownMenuItem>
                            Account Settings
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-red-600 font-medium"
                            onSelect={(e) => {
                                e.preventDefault();
                                handleLogout();
                            }}
                        >
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    );
}