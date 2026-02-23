import tiktoken

PRICING = {
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "gpt-4o-mini": {"input": 0.60, "output": 2.40},
    "gpt-4o": {"input": 2.50, "output": 10.00}
}

def calculate_cost(input_tokens: int, output_tokens: int, model: str = "gpt-4o", image_tokens: int = 0) -> float:
    pricing = PRICING.get(model, PRICING["gpt-4o"])
    total_input = input_tokens + image_tokens
    input_cost = (total_input / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return (input_cost + output_cost) * 1.10

print("6000 tokens of input (resume + JD) and 50 tokens of output (Hi):")
print(f"GPT-4o: ${calculate_cost(6000, 50, 'gpt-4o'):.4f}")
print(f"GPT-4o-mini: ${calculate_cost(6000, 50, 'gpt-4o-mini'):.4f}")

try:
    enc = tiktoken.encoding_for_model("gpt-4o")
    print(f"Tiktoken size of 'hello': {len(enc.encode('hello'))}")
except Exception as e:
    print(f"Tiktoken error: {e}")
