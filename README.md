## dotfiles 🔥
This solution for storing dotfiles is inspired by [this comment][1] on Hacker News!

## Quick Start 🚀
### Initial setup
All of the steps below require a `dotfile` alias. The `.bashrc` and `.zshrc` in this repo already contain the configuration, but if you don't have the configurations pulled from here, you'll have to set it yourself. 

For bash
```sh 
echo "alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'" >> $HOME/.bashrc
```
For zsh
```sh
echo "alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'" >> $HOME/.zshrc
```
For current scope
```sh
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```


### Usage 
1. Clone this repo
    ```sh
    git clone --bare https://github.com/O-Hannonen/dotfiles.git $HOME/.dotfiles
    ```
2. Checkout the content
    ```sh
    dotfiles checkout
    ```

### Updating 
1. Use basic git commands to commit changes
    ```sh
    dotfiles add .zshrc
    dotfiles commit -m "feat: updates .zshrc"
    dotfiles push
    ```
2. That's it!
    
### Setting up a similar repo
1. Initialize git repo
    ```sh
    git init --bare $HOME/.dotfiles
    ```
2. Hide untracked files
    ```sh
    dotfiles config --local status.showUntrackedFiles no
    ```
3. Use basic git commands to add remote commit changes
    ```sh
    dotfiles remote add origin https://github.com/<USERNAME>/dotfiles.git
    dotfiles commit -m "feat: initial commit"
    dotfiles push -u origin main
    ```
    


[1]: https://news.ycombinator.com/item?id=11070797
