"use client";

import { useRouter } from "next/navigation";

const step2 = () => {
    const router = useRouter();
    return (
        <>
            <div className="container mx-auto px-5">
                <div className="innner">
                    <h1 className="text-2xl font-bold mb-6">Step 2</h1>
                </div>
            </div>
        </>
    )
}

export default step2