import autogen
from autogen_api import llm_config
from system_prompt import diabetes_patient_prompt,heart_patient_prompt,greeting_prompt
def agent_creation(interaction_agent):
    scenario_agent_diabetes_patient =autogen.AssistantAgent (
    name="Diabetes_patient",
    description="This agent simulates a diabetes patient to help medical trainees practice communication and diagnostic skills related to diabetes management",
    system_message=diabetes_patient_prompt,
    llm_config=llm_config,
)
    scenario_agent_heart_patient = autogen.AssistantAgent(
    name="Heart_Patient",
    description="This agent simulates a heart patient to help medical trainees practice communication and diagnostic skills related to heart diseases",
    system_message=heart_patient_prompt,
    llm_config=llm_config,
)
  
    greeting_agent = autogen.AssistantAgent(
    name="Greeting_Agent",
    description="This agent handles greetings and responds to queries that fall outside the scope of heart and diabetes patient scenarios.",
    system_message=greeting_prompt,
    llm_config=llm_config,
)
    feedback_agent = autogen.AssistantAgent(
    name="Feedback_Agent",
    system_message="""
    Provide comprehensive and constructive feedback on the trainee's performance. Focus on these aspects:
    - Overall Performance: General assessment of skills and protocol adherence.
    - Communication: Clarity, articulation, and empathy.
    - Diagnostic Accuracy: Correctness of diagnosis and symptom assessment.
    - Treatment and Management: Appropriateness of treatment plans and patient education.
    - Areas for Improvement: Specific suggestions and positive reinforcement.
     At the end of your feedback response, please add a terminate msg that says "Practice Well ,All the Best"
    """,
     human_input_mode="NEVER",
    llm_config=llm_config,

)
    agents=[interaction_agent,scenario_agent_diabetes_patient,scenario_agent_heart_patient,feedback_agent,greeting_agent]
    return agents