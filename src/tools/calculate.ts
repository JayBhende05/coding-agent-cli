

export function calculate(expression : string) : string{
  try {
    const result = eval(expression); // Use safe evaluation in production
    return JSON.stringify({ result: result });
  } catch (e) {
    return JSON.stringify({ error: "Invalid expression" });
}
}


