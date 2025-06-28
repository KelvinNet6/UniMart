 const supabaseClient = supabase.createClient(
      "https://honrgtrvzpymssmlbcbn.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnJndHJ2enB5bXNzbWxiY2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODMzOTEsImV4cCI6MjA2Mzg1OTM5MX0.dcQNVrulRZxGvyeYX6Wq8VtJKi3OYpYVzirR5jk8axw"
    );
    const feedWrapper = document.getElementById("product-feed-wrapper");
    const feed = document.getElementById("product-feed");
    const searchInput = document.getElementById("search");
    const searchBtn = document.getElementById("search-btn");
    const loginSection = document.getElementById("login-section");
    const registerSection = document.getElementById("register-section");
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");
    const logoutLink = document.getElementById("logout-link");
    const welcomeMessage = document.getElementById("welcome-message");
    const searchBar = document.getElementById("search-bar");
    const navBar = document.getElementById("nav-bar");
    const profileLink = document.getElementById("profile-link");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");
    const googleLoginBtn = document.getElementById("google-login-btn");
    const resetPasswordBtn = document.getElementById("reset-password-btn");
    const openMenuBtn = document.getElementById("open-menu");
    const openTradersBtn = document.getElementById("open-traders");
    const menuPanel = document.getElementById("mobile-menu-panel");
    const tradersPanel = document.getElementById("mobile-traders-panel");
    const badge = document.getElementById('message-badge');

    let allProducts = [];
    let currentUserId = null;
    let page = 0;
    const pageSize = 10;
    let isLoading = false;

   async function fetchMoreProducts() {
  if (isLoading) return;
  isLoading = true;

  const { data, error } = await supabaseClient
    .from("products")
    .select('*, profiles(username)')
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    console.error("Error fetching products:", error);
    isLoading = false;
    return;
  }

  if (data && data.length > 0) {
    const productsWithUsernames = data.map(product => ({
      ...product,
      user: product.profiles?.username || 'Unknown'
    }));

    allProducts = allProducts.concat(productsWithUsernames);
    displayProducts(productsWithUsernames, searchInput.value);
    page++;
  }

  isLoading = false;
}
    
function displayProducts(products, filter = "") {
  const baseUrl = "https://honrgtrvzpymssmlbcbn.supabase.co/storage/v1/object/public/product-images/";

  feed.innerHTML = "";

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    feed.innerHTML = "<p>No products found.</p>";
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.classList.add("product-card");

    let images = [];

    try {
      const parsed = JSON.parse(p.image_url); // Try parsing as JSON array
      images = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      images = [p.image_url]; // Fallback to single image
    }

    images = images.map(url => url.startsWith("http") ? url : baseUrl + url);

   card.innerHTML = `
  <div class="carousel">
    ${images.map((url, index) => `
      <img src="${url}" class="carousel-img" style="display: ${index === 0 ? 'block' : 'none'};">
    `).join('')}
    ${images.length > 1 ? `
      <button class="prev">‹</button>
      <button class="next">›</button>
    ` : ''}
  </div>
  <div class="info">
    <h3>${p.name}</h3>
    <p>Price: ${Number(p.price).toLocaleString('en-MW', { style: 'currency', currency: 'MWK' })}</p>
    <p class="posted-by">Listed by ${p.user}</p>

    <div class="button-row">
      <a href="profile.html?user_id=${p.user_id}" class="shop-button">🏬 Visit Shop</a>
      <a href="messages.html?user_id=${p.user_id}&user_name=${encodeURIComponent(p.user)}&product_name=${encodeURIComponent(p.name)}" class="shop-button">💬 Message</a>
      <a href="checkout.html?product_id=${p.id}" class="shop-button">🛒 Buy</a>
    </div>
  </div>
`;
    feed.appendChild(card);
    // Carousel button functionality
    if (images.length > 1) {
      const imgs = card.querySelectorAll(".carousel-img");
      let current = 0;

      card.querySelector(".next").addEventListener("click", () => {
        imgs[current].style.display = "none";
        current = (current + 1) % imgs.length;
        imgs[current].style.display = "block";
      });
      card.querySelector(".prev").addEventListener("click", () => {
        imgs[current].style.display = "none";
        current = (current - 1 + imgs.length) % imgs.length;
        imgs[current].style.display = "block";
      });
    }
  });
}
  // Add click listeners for the message buttons
  document.querySelectorAll(".message-trader-btn").forEach(button => {
    button.addEventListener("click", () => {
      const userId = button.dataset.userId;
      const userName = button.dataset.userName;
      const productName = button.dataset.productName;

      openChat({
        id: userId,
        name: userName,
        lastMessage: `Hi, I'm interested in your "${productName}".`,
        productName: productName
      });
    });
  });

// Load traders into desktop panel first
  async function loadTradersAndCloneToMobile() {
    const list = document.getElementById('traders-container');
    if (!list) return;

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, username, bio, location, profile_image_url')
        .order('id', { ascending: false })
        .limit(10);

      if (error) throw error;

      list.innerHTML = "";

      if (data.length === 0) {
        list.innerHTML = "<p>No traders found.</p>";
      } else {
        data.forEach(trader => {
          const div = document.createElement('div');
          div.className = 'trader-card';
          div.innerHTML = `
            <h4><a href="profile.html?user_id=${trader.id}" class="trader-link">${trader.username}</a></h4>
            <p>${trader.bio || 'No bio available.'}</p>
            <small>${trader.location || 'Unknown location'}</small>
          `;
          list.appendChild(div);
        });
      }

      // 🔁 Now that traders loaded, clone content to mobile
      moveContentToMobilePanels();

    } catch (err) {
      console.error("Error loading traders:", err.message);
      list.innerHTML = "<p>Error loading traders.</p>";
    }
  }

  function moveContentToMobilePanels() {
    const menuContent = document.getElementById("mobile-menu-content");
    const tradersContent = document.getElementById("mobile-traders-content");

    const originalMenu = document.getElementById("left-sidebar");
    const originalTraders = document.getElementById("random-traders");

    menuContent.innerHTML = "";
    tradersContent.innerHTML = "";

    if (originalMenu) {
      const menuClone = originalMenu.cloneNode(true);
      menuContent.appendChild(menuClone);
    }

    if (originalTraders) {
      const tradersClone = originalTraders.cloneNode(true);
      tradersContent.appendChild(tradersClone);
    }
  }

  function closePanels() {
    document.getElementById("mobile-menu-panel").classList.remove("show");
    document.getElementById("mobile-traders-panel").classList.remove("show");
  }

  // on button click – just show the panel
document.getElementById("open-menu").addEventListener("click", () => {
  moveContentToMobilePanels();  // Clone content freshly
  document.getElementById("mobile-menu-panel").classList.add("show");
});
document.getElementById("open-traders").addEventListener("click", () => {
  moveContentToMobilePanels();  // Clone content freshly
  document.getElementById("mobile-traders-panel").classList.add("show");
});


  // ✅ Load traders + clone after page is ready
  document.addEventListener("DOMContentLoaded", () => {
    loadTradersAndCloneToMobile();
  });
   
let messageChannel = null;

    async function updateUI() {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const user = session?.user;

      if (user) {
         currentUserId = user.id; 
         loginSection.style.display = "none";
         registerSection.style.display = "none";
         welcomeMessage.style.display = "block";
         welcomeMessage.textContent = `Welcome, ${user.email}`;

    if (!messageChannel) {
      messageChannel = supabaseClient
      .channel('realtime:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        const newMessage = payload.new;

        if (newMessage.receiver_id === currentUserId && newMessage.sender_id !== currentUserId) {
          incrementBadge();
        }

        if (newMessage.chat_id === currentChatId) {
          openChat(currentChatUser);
        }

              loadConversations();
           })
          .subscribe();
      }
        
         setTimeout(() => {
         welcomeMessage.style.display = "none";
      }, 5000);

      document.getElementById('left-sidebar').style.display = "block"; 
      document.getElementById('random-traders').style.display = "block"; 
      document.body.classList.add('logged-in');
         
      feedWrapper.style.display = "block";
      searchBar.style.display = "flex";
      navBar.style.display = "flex";
      profileLink.style.display = "inline";
      logoutLink.style.display = "inline";

     feed.innerHTML = "";
     allProducts = [];
     page = 0;
     await fetchMoreProducts();
   } else {
     loginSection.style.display = "flex";
     registerSection.style.display = "none";
     feedWrapper.style.display = "none";
     welcomeMessage.style.display = "none";
     searchBar.style.display = "none";
     navBar.style.display = "none";
     profileLink.style.display = "none";
     logoutLink.style.display = "none";

     document.getElementById('left-sidebar').style.display = "none"; 
     document.getElementById('random-traders').style.display = "none"; 
     document.body.classList.remove('logged-in');
   }
}

    loginBtn.addEventListener("click", async () => {
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Login error: " + error.message);

        resetPasswordBtn.style.display = "inline-block";
        
      } else {

        resetPasswordBtn.style.display = "none";
        
        updateUI();
      }
    });

    registerBtn.addEventListener("click", async () => {
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        alert("Registration error: " + error.message);
      } else {
        alert("Registered successfully! Logging in...");
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (signInError) {
          alert("Auto-login failed: " + signInError.message);
          return;
        }
        updateUI();
      }
    });

    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      updateUI();
    });

    searchBtn.addEventListener("click", async () => {
      feed.innerHTML = "";
      page = 0;
      allProducts = [];
      await fetchMoreProducts();
    });

    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginSection.style.display = "none";
      registerSection.style.display = "flex";
    });

    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerSection.style.display = "none";
      loginSection.style.display = "flex";
    });

    googleLoginBtn.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://kelvinnet6.github.io/UniMart/",
        },
      });
      if (error) alert("Google login error: " + error.message);
    });

    resetPasswordBtn.addEventListener("click", async () => {
      const email = prompt("Please enter your email for password reset:");
      if (!email) return alert("Email is required.");
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) {
        alert("Reset password error: " + error.message);
      } else {
        alert("If that email is registered, a password reset link has been sent.");
      }
    });

    // Infinite scroll
    window.addEventListener("scroll", () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 ) {
        fetchMoreProducts();
      }
    });

    // Initial UI
    updateUI();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      updateUI();
    });
async function updateMessageBadge() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user || !badge) return;

  const { count, error: fetchError } = await supabaseClient
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  if (fetchError) {
    console.error('Failed to fetch unread messages:', fetchError);
    return;
  }

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}
   
function incrementBadge() {
  const currentCount = parseInt(localStorage.getItem('unreadMessages')) || 0;
  const newCount = currentCount + 1;
  localStorage.setItem('unreadMessages', newCount);
  window.dispatchEvent(new Event('storage')); // notify other tabs

  if (badge) {
    badge.textContent = newCount;
    badge.style.display = 'inline-block';
  }
}

document.addEventListener('DOMContentLoaded', updateMessageBadge);
window.addEventListener('focus', updateMessageBadge);

   window.addEventListener('storage', (e) => {
  if (e.key === 'unreadMessages') {
    updateMessageBadge(); 
  }
});
