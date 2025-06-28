import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

  const supabaseUrl = 'https://honrgtrvzpymssmlbcbn.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnJndHJ2enB5bXNzbWxiY2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODMzOTEsImV4cCI6MjA2Mzg1OTM5MX0.dcQNVrulRZxGvyeYX6Wq8VtJKi3OYpYVzirR5jk8axw'
  const supabase = createClient(supabaseUrl, supabaseKey)

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("product_id");

  let product;

  if (!productId) {
    alert("Product ID not found in URL.");
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error || !data) {
      alert("Product not found.");
    } else {
      product = data;
      let imageUrl = product.image_url;
      if (!imageUrl.startsWith("http")) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/profile-bucket-1/${imageUrl}`;
      }

      document.getElementById("product-image").src = imageUrl;
      document.getElementById("product-name").textContent = product.name;
      document.getElementById("product-category").textContent = `Category: ${product.category || "N/A"}`;
      document.getElementById("product-price").textContent = `Price: ${product.price}`;
    }
  }

  document.getElementById("checkout-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Inside your checkout-form submit handler:

const buyerEmail = document.getElementById("email").value;
const price = parseFloat(product.price);

const token = "hghvhliuuuhuhuhougkuvfxsew3q2zxtyo";

const walletRes = await fetch("https://unayo.standardbank.com/unayo/personal/unayo-internet-banking", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ email: buyerEmail })
});

const walletInfo = await walletRes.json();

if (!walletRes.ok || !walletInfo.success) {
  return alert("ProWallet account lookup failed: " + (walletInfo.message || walletRes.statusText));
}

if (walletInfo.balance < price) {
  return alert("Insufficient ProWallet balance.");
}


  const paymentRes = await fetch("https://unayo.standardbank.com/unayo/personal/unayo-internet-banking", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    email: buyerEmail,
    amount: price,
    reference: productId
  })
});

const paymentInfo = await paymentRes.json();

if (!paymentRes.ok || !paymentInfo.success) {
  return alert("Payment failed: " + (paymentInfo.message || paymentRes.statusText));
}

    // Log transaction
    await supabase.from("transactions").insert({
      email: buyerEmail,
      amount: price,
      type: "purchase",
      product_id: productId,
      created_at: new Date().toISOString(),
    });

    // Delete product after payment
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      return alert("Payment succeeded but failed to delete product.");
    }

    alert("Payment successful! Product purchased.");
    window.location.href = "index.html";
  });
