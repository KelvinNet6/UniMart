const supabaseClient = supabase.createClient(
      "https://honrgtrvzpymssmlbcbn.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnJndHJ2enB5bXNzbWxiY2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODMzOTEsImV4cCI6MjA2Mzg1OTM5MX0.dcQNVrulRZxGvyeYX6Wq8VtJKi3OYpYVzirR5jk8axw"
    );
  const listContainer = document.getElementById('messages-list');
  const chatUserName = document.getElementById('chat-user-name');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');
  const emojiButton = document.getElementById('emoji-button');
  const chatWidget = document.getElementById('chat-widget');
  const slideDownButton = document.getElementById('slide-down-button');
  const chatToggle = document.getElementById('chat-toggle');

  let currentUserId = null;
  let currentChatUser = null;
  let currentChatId = null;

  async function getUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    currentUserId = user.id;
    await loadConversations();
    await markAllMessagesAsRead();

    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('user_id');
    const targetUsername = params.get('user_name');
    const productName = params.get('product_name');

    if (targetUserId && targetUsername) {
      let profilePic = 'https://via.placeholder.com/40';
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('profile_image_url')
        .eq('id', targetUserId)
        .single();

      if (profile?.profile_image_url) {
        profilePic = profile.profile_image_url;
      }

      openChat({
        id: targetUserId,
        username: decodeURIComponent(targetUsername),
        profile_pic: profilePic
      });

      // Pre-fill message
      if (productName) {
        chatInput.value = `Hi ${decodeURIComponent(targetUsername)}, I'm interested in your product: ${decodeURIComponent(productName)}.`;
      }

      // Clean URL
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  async function loadConversations() {
    
  const { data: messages, error } = await supabaseClient
  .from('messages')
  .select(`
    *,
    sender:profiles!messages_sender_id_fkey (
      id, username, profile_image_url
    ),
    receiver:profiles!messages_receiver_id_fkey (
      id, username, profile_image_url
    )
  `)
  .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
  .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const chatMap = new Map();

    messages.forEach(msg => {
      const otherUser = msg.sender.id === currentUserId ? msg.receiver : msg.sender;
      if (!chatMap.has(msg.chat_id)) {
       chatMap.set(msg.chat_id, {
          ...otherUser,
         profile_pic: otherUser.profile_image_url, 
         chat_id: msg.chat_id,
         lastMessage: msg.content,
         lastTime: msg.created_at
       });
      }
    });

    listContainer.innerHTML = '';

    [...chatMap.values()]
      .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
      .forEach(user => {
        const item = document.createElement('div');
        item.className = 'message-item';
        item.onclick = () => openChat(user);
        item.innerHTML = `
          <img src="${user.profile_pic || 'https://via.placeholder.com/60'}" alt="Profile Picture">
          <div class="message-details">
            <h4>${user.username}</h4>
            <p>${user.lastMessage}</p>
          </div>
        `;
        listContainer.appendChild(item);
      });
  }

 async function openChat(user) {
  currentChatUser = user;
  currentChatId = [currentUserId, user.id].sort().join('-');
  chatUserName.textContent = user.username;
  chatWidget.classList.remove('slide-down');
  chatWidget.classList.add('slide-up');
  chatWidget.style.display = 'block';
  chatToggle.style.display = 'none';
  chatInput.value = '';
  chatInput.focus();

  const { data: messages, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('chat_id', currentChatId)
    .order('created_at', { ascending: true });

  chatMessages.innerHTML = '';
  if (!error && messages.length) {
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.classList.add('message', msg.sender_id === currentUserId ? 'sent' : 'received');
      const bubble = document.createElement('div');
      bubble.classList.add('bubble');
      bubble.textContent = msg.content;
      div.appendChild(bubble);
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ✅ Mark messages in this chat as read
  await supabaseClient
    .from('messages')
    .update({ is_read: true })
    .eq('chat_id', currentChatId)
    .eq('receiver_id', currentUserId)
    .eq('is_read', false);
   
  localStorage.setItem('unreadMessages', '0');
  window.dispatchEvent(new Event('storage'));
}

  async function sendMessage(content) {
    const { error } = await supabaseClient.from('messages').insert([{
      chat_id: currentChatId,
      sender_id: currentUserId,
      receiver_id: currentChatUser.id,
      content: content
    }]);

    if (!error) {
  const div = document.createElement('div');
  div.classList.add('message', 'sent');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.textContent = content;
  div.appendChild(bubble);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatInput.value = '';
 }
}

  sendButton.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if (msg !== '') sendMessage(msg);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendButton.click();
  });

  emojiButton.addEventListener('click', () => {
    chatInput.value += '😊';
    chatInput.focus();
  });

  slideDownButton.addEventListener('click', () => {
    chatWidget.classList.remove('slide-up');
    chatWidget.classList.add('slide-down');
    setTimeout(() => {
      chatWidget.style.display = 'none';
      chatToggle.style.display = 'block';
    }, 300);
  });

  chatToggle.addEventListener('click', () => {
    chatToggle.style.display = 'none';
    chatWidget.classList.remove('slide-down');
    chatWidget.classList.add('slide-up');
    chatWidget.style.display = 'block';
  });

  supabaseClient
  .channel('realtime:messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    const msg = payload.new;

    // Ignore if this is a message from the current chat you're viewing
    const isCurrentChat = msg.chat_id === currentChatId;

    // Ignore messages sent by the user themselves
    const isFromSelf = msg.sender_id === currentUserId;

    if (!isCurrentChat && !isFromSelf) {
      let count = parseInt(localStorage.getItem('unreadMessages')) || 0;
      localStorage.setItem('unreadMessages', count + 1);
    }

    loadConversations();

    if (isCurrentChat) {
      openChat(currentChatUser);
    }
  })
  .subscribe(); 

  getUser();
  
  function updateBadgeFromStorage() {
    const badge = document.getElementById('message-badge');
    const count = parseInt(localStorage.getItem('unreadMessages')) || 0;

    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }
  document.addEventListener('DOMContentLoaded', updateBadgeFromStorage);
  setInterval(updateBadgeFromStorage, 5000);

  async function markAllMessagesAsRead() {
  if (!currentUserId) return;

  const { error } = await supabaseClient
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', currentUserId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
  } else {
    localStorage.setItem('unreadMessages', '0');

    window.dispatchEvent(new Event('storage'));
  }
}
