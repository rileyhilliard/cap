#!/bin/bash

# Check if Homebrew is installed, install if not
if test ! $(which brew); then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi


# List of dependencies to check and install
# add more here if there are others you need
dependencies=(mongodb-community@7.0)

# Function to check if a package is installed
is_installed() {
    brew ls --versions "$1" > /dev/null
}

# Array to hold dependencies that need to be installed
declare -a to_install

# Check each dependency and add to the install list if not installed
for dep in "${dependencies[@]}"; do
    if ! is_installed "$dep"; then
        echo "$dep is not installed. Marking for installation."
        to_install+=("$dep")
    else
        echo "$dep is already installed."
    fi
done

# Install all marked dependencies in one command
if [ ${#to_install[@]} -ne 0 ]; then
    echo "Installing missing dependencies: ${to_install[*]}"
    brew install "${to_install[@]}"
else
    echo "All dependencies are already installed."
fi

echo "Setup complete!"