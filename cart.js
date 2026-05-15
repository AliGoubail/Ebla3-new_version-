
const cartBtn = document.querySelector(".cart-button button");
const cartSidebar = document.getElementById("cart-sidebar");
const cartOverlay = document.getElementById("cart-overlay");
const closeCart = document.getElementById("close-cart");

cartBtn.addEventListener("click", () => {
    cartSidebar.classList.add("active");
    cartOverlay.classList.add("active");
});

closeCart.addEventListener("click", closeSidebar);
cartOverlay.addEventListener("click", closeSidebar);

function closeSidebar() {
    cartSidebar.classList.remove("active");
    cartOverlay.classList.remove("active");
}
