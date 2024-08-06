import os
import time
import asyncio
import threading
import autogen
from flask import Flask, request, jsonify
from flask_cors import CORS
from autogen.agentchat import  UserProxyAgent
import queue
from system_prompt import group_manager_prompt
app = Flask(__name__)
cors=CORS(app)
from system_prompt import diabetes_patient_prompt,heart_patient_prompt,greeting_prompt,Feedback_prompt

chat_status = "ended"  

# Queues for single-user setup
print_queue = queue.Queue()
user_queue = queue.Queue()

# Replace with your actual OpenAI API key
endpoint = "https://bitcot-ai-service.openai.azure.com/"
api_key = "c7ec13ca85084d56bb938dfea0e7a94c"
config_list = [
   {
        'model': 'gpt-4o',
        'api_key': api_key,
        'base_url': endpoint,
        'api_type': 'azure',
        'api_version': '2024-02-01'
    },

]
llm_config={
    "config_list": config_list,
}
def agent_creation(userproxy):
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
    system_message=Feedback_prompt,
     human_input_mode="NEVER",
    llm_config=llm_config,

)

    scenario_agent_heart_patient.register_reply(
        [autogen.Agent, None],
        reply_func=print_messages, 
        config={"callback": None},
    ) 
    scenario_agent_diabetes_patient.register_reply(
        [autogen.Agent, None],
        reply_func=print_messages, 
        config={"callback": None},
    ) 
    greeting_agent.register_reply(
        [autogen.Agent, None],
        reply_func=print_messages, 
        config={"callback": None},
    )

    feedback_agent.register_reply(
        [autogen.Agent, None],
    reply_func=print_messages, 
    config={"callback": None},
) 
    agents=[userproxy,scenario_agent_diabetes_patient,scenario_agent_heart_patient,feedback_agent,greeting_agent]
    return agents
class UserProxyAgent(autogen.ConversableAgent):
    async def a_get_human_input(self, prompt: str) -> str:
        # input_prompt = "Please input your further direction, or type 'approved' to proceed, or type 'exit' to end the conversation"

        # print_queue.put({'user': "System", 'message': input_prompt})

        start_time = time.time()
        global chat_status
        chat_status = "inputting"
        while True:
            if not user_queue.empty():
                input_value = user_queue.get()
                chat_status = "Chat ongoing"
                print("input message: ", input_value)
                return input_value

            if time.time() - start_time > 600:  
                chat_status = "ended"
                return "exit"

            await asyncio.sleep(1) 

def print_messages(recipient, messages, sender, config):
    # Checking if the sender is 'Interaction_Agent' or if it's a system message based on role
    if sender.name == "Interaction_Agent" or messages[-1]['role'] == 'system':
        print(f"Filtered out system or Interaction_Agent message from: {sender.name}")
        return False, None  # Skipping adding these messages to the print queue

    print(f"Messages from: {sender.name} sent to: {recipient.name} | num messages: {len(messages)} | message: {messages[-1]}")

    content = messages[-1]['content']
    # Assuming all messages have a 'name' key; adjust if this assumption is incorrect
    user = messages[-1].get('name', sender.name)
    print_queue.put({'user': user, 'message': content})

    return False, None #conversation continued
 
         
async def initiate_chat(agent, recipient, message):
    print(agent)
    result = await agent.a_initiate_chat(recipient, message=message, clear_history=False)
    print(result)

    return result
def run_chat(request_json):
    global chat_status
    manager = None
    assistants = []
    try:
        # a) Data structure for the request
        user_input = request_json.get('message')
        # b) UserProxy creation
        userproxy = create_userproxy()
        # c) Chat creation
        manager, assistants = create_groupchat(userproxy) 
        # d) Chat start
        asyncio.run(initiate_chat(userproxy, manager, user_input))

        chat_status = "ended"

    except Exception as e:
        chat_status = "error"
        print_queue.put({'user': "System", 'message': f"An error occurred: {str(e)}"})

def create_userproxy():
    interaction_agent =UserProxyAgent (
    name="Interaction_Agent",
    description="This agent simulates a medical trainee interacting Selected patient simulation agent to practice communication and diagnostic skills. It serves as a bridge between the Trainee and the patient simulation agents",
    human_input_mode="ALWAYS",
    system_message="You are an advanced AI designed to simulate a medical trainee interacting with patient simulation agents to practice communication and diagnostic skills related to heart diseases or diabetes. You act as a bridge between the Trainee and the patient simulation agents, ensuring a realistic and educational interaction.",
    llm_config=llm_config,

)
    interaction_agent.register_reply(
        [autogen.Agent, None],
        reply_func=print_messages, 
        config={"callback": None},
    )
    return interaction_agent



def create_groupchat(userproxy ):   

    agents=agent_creation(userproxy)

    groupchat = autogen.GroupChat(agents=agents,messages=[],
                              allow_repeat_speaker=False,    speaker_selection_method="auto",
                              max_round=50,select_speaker_message_template=group_manager_prompt,
                              )
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config, is_termination_msg=lambda msg: "Thank you" in msg["content"]
)
    manager = autogen.GroupChatManager(
            groupchat=groupchat, 
            llm_config=llm_config, 
            system_message="",
        )

    return manager, agents

@app.route('/api/start_chat', methods=['POST', 'OPTIONS']) 
def start_chat():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    elif request.method == 'POST':
        global chat_status
        try:

            if chat_status == 'error':
                chat_status = 'ended' 

            with print_queue.mutex:
                print_queue.queue.clear()
            with user_queue.mutex:
                user_queue.queue.clear()

            chat_status = 'Chat ongoing'

            thread = threading.Thread(
                target=run_chat, 
                args=(request.json,)
            )
            thread.start()
    
            return jsonify({'status': chat_status})
        except Exception as e:
            return jsonify({'status': 'Error occurred', 'error': str(e)})
        
@app.route('/api/send_message', methods=['POST'])
def send_message():
    user_input = request.json['message']
    user_queue.put(user_input)
    return jsonify({'status': 'Message Received'})

@app.route('/api/get_message', methods=['GET'])
def get_messages():
    global chat_status 

    if not print_queue.empty():
        msg = print_queue.get()  
        return jsonify({'message': msg, 'chat_status': chat_status}), 200
    else:
        return jsonify({'message': None, 'chat_status': chat_status}), 200
    

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5008, debug=True)