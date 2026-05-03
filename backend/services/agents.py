import os
from groq import Groq
import json

class DebateSystem:
    def __init__(self):
        # We will retrieve the key from environment, or it could be passed via Settings from DB
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.client = Groq(api_key=self.api_key) if self.api_key else None
        # Using a fast, reasoning-capable model on Groq
        self.model = "llama-3.3-70b-versatile"

    def is_configured(self):
        return self.client is not None

    def set_api_key(self, api_key: str):
        self.api_key = api_key
        self.client = Groq(api_key=self.api_key)

    def generate_initial_answer(self, query: str, context: str) -> str:
        prompt = f"""
        You are a helpful Research Assistant. 
        Given the following context from document retrieved via RAG:
        {context}
        
        Answer the user's query: {query}
        Provide citations to the context where applicable.
        """
        response = self.client.chat.completions.create(
            messages=[{"role": "system", "content": "You are a direct, concise answer generator."},
                      {"role": "user", "content": prompt}],
            model=self.model,
        )
        return response.choices[0].message.content

    def critique_answer(self, query: str, context: str, initial_answer: str) -> str:
        prompt = f"""
        You are a harsh but fair fact-checker and critic.
        User Query: {query}
        Context: {context}
        Proposed Answer: {initial_answer}
        
        Critique the proposed answer. Are there hallucinations? Did it miss important details from the context?
        If the answer is perfect, say "The answer is accurate and complete."
        Otherwise, provide specific corrections.
        """
        response = self.client.chat.completions.create(
            messages=[{"role": "system", "content": "You are a critical fact-checker."},
                      {"role": "user", "content": prompt}],
            model=self.model,
        )
        return response.choices[0].message.content

    def synthesize_final_answer(self, query: str, initial_answer: str, critique: str) -> str:
        prompt = f"""
        You are the final Synthesizer.
        User Query: {query}
        Initial Answer: {initial_answer}
        Critic's Feedback: {critique}
        
        Combine the initial answer and the critic's feedback into a final, highly accurate, and well-structured response.
        Ensure you only rely on the facts presented.
        """
        response = self.client.chat.completions.create(
            messages=[{"role": "system", "content": "You are the final synthesizer."},
                      {"role": "user", "content": prompt}],
            model=self.model,
        )
        return response.choices[0].message.content

    def run_debate(self, query: str, context: str):
        if not self.is_configured():
            raise Exception("Groq API key not configured.")
            
        transcript = []
        
        # Step 1: Generator
        initial = self.generate_initial_answer(query, context)
        transcript.append({"agent": "Generator", "content": initial})
        
        # Step 2: Critic
        critique = self.critique_answer(query, context, initial)
        transcript.append({"agent": "Critic", "content": critique})
        
        # Step 3: Synthesizer
        final = self.synthesize_final_answer(query, initial, critique)
        transcript.append({"agent": "Synthesizer", "content": final})
        
        return {
            "final_answer": final,
            "transcript": transcript
        }

debate_system = DebateSystem()
