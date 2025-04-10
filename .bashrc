# Fig pre block. Keep at the top of this file.
[[ -f "$HOME/.fig/shell/bashrc.pre.bash" ]] && builtin source "$HOME/.fig/shell/bashrc.pre.bash"
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk

export PATH="$HOME/Development/apache-maven-3.9.1/bin:$HOME/.pub-cache/bin:$PATH"

# Fig post block. Keep at the bottom of this file.
[[ -f "$HOME/.fig/shell/bashrc.post.bash" ]] && builtin source "$HOME/.fig/shell/bashrc.post.bash"
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=/Users/om'
