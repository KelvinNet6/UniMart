import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

  const supabaseUrl = 'https://honrgtrvzpymssmlbcbn.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnJndHJ2enB5bXNzbWxiY2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODMzOTEsImV4cCI6MjA2Mzg1OTM5MX0.dcQNVrulRZxGvyeYX6Wq8VtJKi3OYpYVzirR5jk8axw'
  const supabase = createClient(supabaseUrl, supabaseKey)

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('user_id');
}
  
  // Current logged-in user
  let currentUser = null;
  
async function fetchUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert('Please log in first.');
    return;
  }

  currentUser = user;

  const profileUserId = getUserIdFromUrl() || user.id; // 👈 detect if viewing someone else
  const viewingOwnProfile = profileUserId === user.id;

  // Insert user in 'users' table if not exists (only for logged-in user)
  const { data: existingUser, error: userCheckError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingUser) {
    const { error: insertUserError } = await supabase.from('users').insert({
      id: user.id,
      username: user.user_metadata?.username || '',
      email: user.email,
      role: 'trader'
    });

    if (insertUserError) {
      console.error('Failed to insert user into users table:', insertUserError.message);
    }
  }

  // Ensure profile exists for the logged-in user only
  await ensureProfile(user.id);


if (viewingOwnProfile) {
  // Show inbox button, hide message button
  document.getElementById('inbox-button')?.classList.remove('hidden');
  document.getElementById('message-trader-btn')?.classList.add('hidden');
   } else {
    document.getElementById('edit-profile-button')?.classList.add('hidden');
    document.getElementById('add-product-button')?.classList.add('hidden');
    document.getElementById('edit-header-button')?.classList.add('hidden');
  // Hide inbox icon, show message trader button
    document.getElementById('inbox-button')?.classList.add('hidden');
    document.getElementById('message-trader-btn')?.classList.remove('hidden');
}
  // Load the correct profile and products
  loadUserProfile(profileUserId);
  loadUserProducts(profileUserId);
}

async function ensureProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!data) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      username: currentUser.user_metadata?.username || '',
      location: '',
      bio: '',
      profile_image_url: '',
      cover_image_url: ''
    });
    if (insertError) console.error('Profile creation failed:', insertError.message);
  }
}

async function loadUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return;
  }

  if (data) {
    document.getElementById('display-name').textContent = data.username || 'Trader Name';
    document.getElementById('display-location').textContent = data.location || '';
    document.getElementById('display-bio').textContent = data.bio || '';
    document.getElementById('profile-image').src = data.profile_image_url || 'https://via.placeholder.com/120';

    if (data.cover_image_url) {
      document.querySelector('.cover-photo').style.backgroundImage = `url('${data.cover_image_url}')`;
    }

    // Set the Message button URL
    const messageBtn = document.getElementById('message-trader-btn');
    if (messageBtn) {
      messageBtn.setAttribute(
        'href',
        `messages.html?user_id=${userId}&user_name=${encodeURIComponent(data.username)}`
      );
    }
  }
}


  async function loadUserProducts(userId) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const productGrid = document.getElementById('product-grid');
  productGrid.innerHTML = '';

  if (data && data.length > 0) {
    data.forEach(product => {
      // ✅ Robust image parsing logic
      let images = [];
      try {
        const parsed = JSON.parse(product.image_url);
        images = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        images = [product.image_url]; // fallback for plain URL strings
      }

      const card = document.createElement('div');
      card.className = 'product-card';
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
          <h3>${product.name}</h3>
          <p>${product.price}</p>
          <p>${product.category}</p>
          <p>${product.description || ''}</p>
        </div>
      `;
      productGrid.appendChild(card);

      // ✅ Add carousel only if more than one image
      if (images.length > 1) {
        const imgs = card.querySelectorAll('.carousel-img');
        let current = 0;

        card.querySelector('.next').onclick = () => {
          imgs[current].style.display = 'none';
          current = (current + 1) % imgs.length;
          imgs[current].style.display = 'block';
        };

        card.querySelector('.prev').onclick = () => {
          imgs[current].style.display = 'none';
          current = (current - 1 + imgs.length) % imgs.length;
          imgs[current].style.display = 'block';
        };
      }
    });
  } else {
    productGrid.innerHTML = '<p>No products yet.</p>';
  }
}
  
 async function uploadImage(file, folder) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${currentUser.id}-${Date.now()}.${fileExt}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('profile-bucket-1')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // You might want to allow overwrites
    });

  if (error) {
    alert('Upload failed: ' + error.message);
    throw error;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage
    .from('profile-bucket-1')
    .getPublicUrl(fileName);

  return publicUrl;
}


  // Cover photo upload handling
  document.getElementById('cover-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const url = await uploadImage(file, 'cover_photos');
     document.querySelector('.cover-photo').style.backgroundImage = `url('${url}')`;

      // Update profile cover_url in DB
      const { error } = await supabase
        .from('profiles')
        .update({ cover_image_url: url })
        .eq('id', currentUser.id);

      if (error) alert('Error saving cover photo: ' + error.message);
    } catch (error) {
      console.error(error);
    }
  });

  // Profile image upload handling
  document.getElementById('profile-image').addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const url = await uploadImage(file, 'avatars');
        document.getElementById('profile-image').src = url;

        // Update profile avatar_url in DB
        const { error } = await supabase
          .from('profiles')
          .update({ profile_image_url: url })
          .eq('id', currentUser.id);

        if (error) alert('Error saving profile photo: ' + error.message);
      } catch (error) {
        console.error(error);
      }
    };
    fileInput.click();
  });

  // Add product modal handling
  window.openModal = function () {
             document.getElementById('product-modal').style.display = 'flex';
           };

  window.onclick = function(e) {
    const modal = document.getElementById('product-modal');
    if (e.target === modal) {
      modal.style.display = "none";
    }
  }

  let uploadedProductImageUrl = '';

  function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('preview-image');
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    reader.readAsDataURL(file);
  }

 async function addProduct() {
  if (!currentUser || !currentUser.id) {
    alert('Please wait for user to load or log in again.');
    return;
  }

  const profileId = currentUser.id;
  const name = document.getElementById('product-name').value.trim();
  const price = document.getElementById('product-price').value.trim();
  const category = document.getElementById('product-category').value;
  const description = document.getElementById('product-description').value.trim();
  const imageFileInput = document.getElementById('product-images');
  const imageFiles = Array.from(imageFileInput.files);

  if (!name || !price || !category || imageFiles.length === 0) {
    alert('Please fill all required fields and upload at least one image.');
    return;
  }

  try {
    const imageUrls = [];
    for (const file of imageFiles) {
      const imageUrl = await uploadImage(file, 'products');
      imageUrls.push(imageUrl);
    }
    const { error } = await supabase.from('products').insert([
      {
        user_id: currentUser.id,
        profile_id: profileId,
        name,
        price,
        category,
        description,
        image_url: JSON.stringify(imageUrls), // save as JSON array
        created_at: new Date()
      }
    ]);
    if (error) {
      alert('Error adding product: ' + error.message);
      return;
    }
    loadUserProducts(); // Refresh
    // Clear modal form
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-description').value = '';
    imageFileInput.value = '';
    document.getElementById('preview-images').innerHTML = '';
    document.getElementById('product-modal').style.display = 'none';

  } catch (error) {
    console.error(error);
    alert('Failed to upload product images.');
  }
}
window.goToEdit = function() {
  document.getElementById('edit-profile-modal').style.display = 'flex';
  // Pre-fill current values
  supabase
    .from('profiles')
    .select('username, location, bio')
    .eq('id', currentUser.id)
    .single()
    .then(({ data }) => {
      if (data) {
        document.getElementById('edit-username').value = data.username || '';
        document.getElementById('edit-location').value = data.location || '';
        document.getElementById('edit-bio').value = data.bio || '';
      }
    });
};
window.saveProfile = async function() {
  const username = document.getElementById('edit-username').value.trim();
  const location = document.getElementById('edit-location').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();

  const { error } = await supabase
    .from('profiles')
    .update({ username, location, bio })
    .eq('id', currentUser.id);

  if (error) {
    alert('Error updating profile: ' + error.message);
    return;
  }
      document.getElementById('edit-profile-modal').style.display = 'none';
      loadUserProfile(); // Refresh displayed info
 };
  window.onload = () => {
  fetchUser();
 };
  window.addProduct = addProduct;
  function previewImages(event) {
  const previewContainer = document.getElementById('preview-images');
  previewContainer.innerHTML = ''; // Clear previous
  const files = event.target.files;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100px';
      img.style.margin = '5px';
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}
