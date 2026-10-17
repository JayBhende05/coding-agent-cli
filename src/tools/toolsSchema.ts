

interface FunctionSchema {
  name: string,
  description: string,
  parameters: {
    type: string,
    properties: {
      expression: {
        type: string,
        description: string,
      },
    },
    required: string[],
  }
}
interface ToolSchema {
  type: "function" ,
  function: FunctionSchema
}


export  const toolsSchema: ToolSchema[] = [
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a mathematical expression",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate",
          },
        },
        required: ["expression"],
      },
    },
  },
];