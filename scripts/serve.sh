#!/bin/bash

# Kill any dangling ports 
lsof -ti:3000 | xargs kill && lsof -ti:4000 | xargs kill

# Kill the existing tmux session named mySession, if it exists
tmux kill-session -t mySession 2>/dev/null

# Start a new tmux session in the background
tmux new-session -d -s mySession 

# Run the start command for package-b (backend) in the main pane
tmux send-keys -t mySession:0 'yarn start:backend' C-m 

# Split tmux window vertically
tmux split-window -h 

# Run the start command for package-a (frontend) in the right pane (1)
# tmux send-keys -t mySession:0.1 'sleep 3 && yarn start:frontend' C-m 

# Attach to the tmux session so you can see the output
tmux attach -t mySession