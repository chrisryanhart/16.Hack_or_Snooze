const testArr = [];

$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");

  //to submit a new story
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $favoritedArticles = $('#favorited-articles');
  const $userProfile = $('#user-profile')

  $userProfile.hide();

  const $newStoryLink = $('#submit-link');
  const $favoritesLink = $('#favorites-link');
  const $myStoriesLink = $('#myStories-link');
  const $navUserDashboard = $('#user-dashboard');


  //click handling event for star or trash icon (<i> element type)
  $('body').on('click','i', async function(evt){
    $star = $(evt.target);

    //detects what the list id was of the event target (#my-articles, etc.)
    $articleId = $star.parent().parent().attr('id');

    const token = {"token": `${currentUser.loginToken}`};
    const username = currentUser.username;
    
    //get id of parent li with story serial number
    const trashStoryId = $star.parent().parent().attr('id');
   
    //if <i> event target is trash, delete parent li
    if($star.hasClass('fa-trash')){
      //send delete request to API.  
      const deleteRes = await StoryList.deleteStory(token, trashStoryId)

      //remove item from #my-articles list
      $star.parent().parent().remove();

      //remove item from other lists
      $favoritedArticles.children(`li#${trashStoryId}`).remove();
      $allStoriesList.children(`li#${trashStoryId}`).remove();
    }else{
      
      $liID = $star.parent().attr('id');

      //if event target was on the favorited-articles list
      if($articleId === "favorited-articles"){

        $favoritedArticles.children(`li#${$liID}`).remove();
        $allStoriesList.children(`li#${$liID}`).children().eq(1).removeClass('fas');
        $ownStories.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
        return;
      }
  
      //if event target was on the all-articles list
      if($articleId === "all-articles-list"){
        //if story was a favorite, delete and remove star
        if($star.hasClass('fas')){
          const deleteFavorite = await User.deleteFavorite(token,$liID, username);

          $favoritedArticles.children(`li#${$liID}`).remove();

          $allStoriesList.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
          $ownStories.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
        }
        //else item was not a favorite; add star
        else{
          const postFavorite = await User.addFavorite(token, $liID, username);

          $allStoriesList.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
          $ownStories.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
          $favoritedArticles.append($star.parent().clone());
        }
      }
      //if event target was on the my-articles list
      if($articleId === "my-articles"){
        //if story was a favorite, delete and remove star
        if($star.hasClass('fas')){
          const deleteFavorite = await User.deleteFavorite(token,$liID, username);

          $favoritedArticles.children(`li#${$liID}`).remove();
          $allStoriesList.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
          $ownStories.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
        }
        
        else{
          const postFavorite = await User.addFavorite(token, $liID, username);
          
          //add item to favorite list
          $favoritedArticles.append($star.parent().clone());

          //remove trash icon and add star
          $favoritedArticles.children(`li#${$liID}`).children().eq(0).children().removeClass('fa-trash');
          $favoritedArticles.children(`li#${$liID}`).children().eq(1).toggleClass('fas');

          //add star to other lists
          $allStoriesList.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
          $ownStories.children(`li#${$liID}`).children().eq(1).toggleClass('fas');
        }
      }
    }
    
  });

  //submit new story
  $submitForm.on('submit', async function(evt){
    evt.preventDefault();

    $favoritedArticles.empty();
    $ownStories.empty();

    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();

    $submitForm.reset;

    const arr = [author,title,url];
    testArr.push(arr);

    const token = {"token": `${currentUser.loginToken}`};
    
    const newStory = {
        "author": `${author}`,
        "title": `${title}`,
        "url": `${url}`
      };
    
    //submit form data to API
    const storyResponse = await storyList.addStory(token, newStory);
    const addedStory = storyResponse.data.story;

    //generate story HTML and append to DOM
    const $contentForDOM = generateStoryHTML(addedStory);
      $trashIcon = $contentForDOM.children().eq(0).children();

    if(!$trashIcon.hasClass('fa-trash')){
      $trashIcon.addClass('fa-trash')
    }

    //populate all-articles with new story
    await generateStories();

    //update favorite and my story sections with new story
    await displayFavorites(currentUser);
    await checkForFavorites(currentUser, storyList);
    await displayOwnStories(currentUser);
    await checkOwnStoryFavorites(currentUser);
    
    $ownStories.prepend($contentForDOM);
    $ownStories.hide();

    $allStoriesList.show();

    $submitForm.trigger('reset');
    $submitForm.hide();
  });

  //switch to favorites view
  $favoritesLink.on('click', function(){
    hideElements();
    $userProfile.hide();
    // $allStoriesList.show();
    $favoritedArticles.show();
  });

  //switch to my stories view
  $myStoriesLink.on('click', function(){
    $favoritedArticles.hide();
    $allStoriesList.hide();
    $userProfile.hide();
    $submitForm.hide();
    $ownStories.show();
   
  });

    //shows submit story form when link is clicked
    $newStoryLink.on('click', function(){
      hideElements();
      $favoritedArticles.hide();
      $allStoriesList.show();
      $submitForm.show();
  
    });


  let storyList = null;
  let currentUser = null;

  await checkIfLoggedIn();

  //adds favorites on page load
  async function displayFavorites(currentuser){
    if(!currentUser){
      return;
    }

    for(story of currentUser.favorites){
      const $favoritesDOM = await generateStoryHTML(story);
      $favoritesDOM.children().eq(1).addClass('fas');
      $favoritedArticles.append($favoritesDOM);
    }
  }

  //updates favorites view with solid star
  async function checkForFavorites(currentUser, storylist){
    if(!currentUser){
      return;
    }

    for(favorite of currentUser.favorites){
      for(ele of storyList.stories){
        if(favorite.storyId === ele.storyId){
          $allStoriesList.children(`li#${favorite.storyId}`).children().eq(1).addClass('fas');
        }
      }
    }
  }


  displayFavorites(currentUser);
  
  //updates my story view with favorited own stories
  async function checkOwnStoryFavorites(currentUser, storylist){
    if(!currentUser){
      return;
    }

    for(favorite of currentUser.favorites){
      for(ele of currentUser.ownStories){
        if(favorite.storyId === ele.storyId){
          $ownStories.children(`li#${favorite.storyId}`).children().eq(1).addClass('fas');
        }
      }
    }
  }

  //display user stories under my stories
  async function displayOwnStories(currentUser){
    if(!currentUser){
      return;
    }

    for(story of currentUser.ownStories){
      const $ownStoryDOM = await generateStoryHTML(story);
      $ownStoryDOM.children().eq(0).children().addClass('fa-trash');

      //add the trash to the ownStories
      $ownStories.prepend($ownStoryDOM);
    }
  }

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

   //updates DOM with login info
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
  
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();

    await generateStories();

    //after login, display user specific information on each page
    await displayFavorites(currentUser);
    await checkForFavorites(currentUser, storyList);
    await displayOwnStories(currentUser);
    await checkOwnStoryFavorites(currentUser);
    console.log(currentUser);
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

   

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
  
    //syncs, but does not display logged in user at the top
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });


  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    // await generateStories();
    $allStoriesList.show();
    $favoritedArticles.hide();

  });

  checkForFavorites(currentUser, storyList);

  await displayOwnStories(currentUser);
  checkOwnStoryFavorites(currentUser);


  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
 
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList

    
    const storyListInstance = await StoryList.getStories();
    // update our global variable

    //resturns story object, but unattached to user 
    storyList = storyListInstance;
    // console.log(storyList);
    // empty out that part of the page
    $allStoriesList.empty();
   
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
      }
  }

  //gets all ids from storylist

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);


    // render story markup

    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span> <i class="fas"></i> </span>
        <i class="far fa-star toggle" id="star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navUserDashboard.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
