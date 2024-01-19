#!/bin/bash

# Kill the existing tmux session named mySession, if it exists
tmux kill-session -t mySession 2>/dev/null

# Start a new tmux session in the background
tmux new-session -d -s mySession 

# Split tmux window vertically
tmux split-window -h 

# Run the start command for package-a in the left pane (0)
tmux send-keys -t mySession:0.0 'lerna run start --scope @estatemetrics/frontend' C-m 

# Run the start command for package-b in the right pane (1)
tmux send-keys -t mySession:0.1 'lerna run start --scope @estatemetrics/backend' C-m 

# Attach to the tmux session so you can see the output
tmux attach -t mySession