import { Tool } from "../types.ts";
import { bashTool } from "./bash.ts";
import { editTool } from "./edit.ts";
import { findTool } from "./find.ts";
import { grepTool } from "./grep.ts";
import { lsTool } from "./ls.ts";
import { readTool } from "./readTool.ts";
import { writeTool } from "./write.ts";

export const tools: Tool[] = [readTool, lsTool, findTool, grepTool, writeTool, editTool, bashTool];
