function validateProduct(req, res, next) {
  const { name, description, price, stock, category_id, image } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Product name is required." });
  }

  if (!description?.trim()) {
    return res.status(400).json({ message: "Description is required." });
  }

  if (price == null || Number(price) <= 0) {
    return res.status(400).json({ message: "Price must be greater than 0." });
  }

  if (stock == null || Number(stock) < 0) {
    return res.status(400).json({ message: "Stock cannot be negative." });
  }

  if (!category_id) {
    return res.status(400).json({ message: "Category is required." });
  }

  if (!image?.trim()) {
    return res.status(400).json({ message: "Image is required." });
  }

  next();
}

module.exports = { validateProduct };
