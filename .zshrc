if [ -f $(brew --prefix)/etc/zsh_completion ]; then
  . $(brew --prefix)/etc/zsh_completion
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

# The next line updates PATH for CLI.
if [ -f '/Users/vladimirsobol/yandex-cloud/path.bash.inc' ]; then source '/Users/vladimirsobol/yandex-cloud/path.bash.inc'; fi

# The next line enables shell command completion for yc.
if [ -f '/Users/vladimirsobol/yandex-cloud/completion.zsh.inc' ]; then source '/Users/vladimirsobol/yandex-cloud/completion.zsh.inc'; fi

