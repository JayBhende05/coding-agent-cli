import { calculate } from "./calculate.ts";

 const availableFunctions:any = {
      "calculate": calculate,
};


export default function getAvaliableTools(functionName : string) : any{
  if(!functionName){
    return new Error ("Function name required to get a Tool")
  }
  return availableFunctions[functionName]
}


