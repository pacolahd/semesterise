// src/app/api/transcript/route.ts
import { NextRequest, NextResponse } from "next/server";

import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { TranscriptData } from "@/lib/types/transcript";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const filename = file.name;
    const ext = path.extname(filename).toLowerCase();

    if (![".html", ".htm", ".mhtml", ".mht", ".pdf"].includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported types: HTML, MHTML, PDF" },
        { status: 400 }
      );
    }

    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `transcript_${uuidv4()}${ext}`);

    // Convert file to buffer and write to temp file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFilePath, buffer);

    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), "scripts", "camu_parser.py");

    try {
      // Call Python script
      const result = await new Promise<TranscriptData>((resolve, reject) => {
        const pythonProcess = spawn("python", [
          scriptPath,
          tempFilePath,
          "--json",
        ]);

        let outputData = "";
        let errorData = "";

        pythonProcess.stdout.on("data", (data) => {
          outputData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
          errorData += data.toString();
        });

        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(`Python process exited with code ${code}: ${errorData}`)
            );
            return;
          }

          try {
            const parsedData = JSON.parse(outputData);
            resolve(parsedData);
          } catch (e) {
            reject(
              new Error(
                `Failed to parse Python output: ${(e as Error)?.message || (e as Error)?.name}`
              )
            );
          }
        });
      });

      // Clean up temp file
      await fs.unlink(tempFilePath);

      return NextResponse.json(result);
    } catch (error) {
      // Make sure to clean up temp file if there's an error
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Failed to delete temp file:", unlinkError);
      }

      return NextResponse.json(
        {
          error: `Transcript parsing failed: ${(error as Error)?.message || (error as Error)?.name}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: `Server error: ${(error as Error)?.message || (error as Error)?.name}`,
      },
      { status: 500 }
    );
  }
}
