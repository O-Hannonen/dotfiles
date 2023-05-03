## dotfiles 🔥
This solution for storing dotfiles is inspired by [this comment][1] on Hacker News!

## Quick Start 🚀
### Initial setup
1. Setup alias
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
2. Install homebrew
    ```sh
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
3. Install brew bundle
    ```sh
    brew tap Homebrew/bundle
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
3. Install contents of Brefile
    ```sh
    brew bundle install
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
3. Create Brewfile which contains everything you've installed with homebrew
    ```sh
    brew bundle dump -f
    ```
4. Use basic git commands to add remote commit changes. You should add all the files here you wan't to include in your dotfiles (also just created Brewfile)
    ```sh
    dotfiles remote add origin https://github.com/<USERNAME>/dotfiles.git
    dotfiles commit -m "feat: initial commit"
    dotfiles push -u origin main
    ```

    


[1]: https://news.ycombinator.com/item?id=11070797
