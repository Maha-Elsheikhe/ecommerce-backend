function validateProduct(req, res, next) {
  const { name, description, price, stock, category_id } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Product name is required." });
  }

  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ message: "Description is required." });
  }

  const priceNum = typeof price === "string" ? Number(price.trim() || NaN) : Number(price);
  if (price == null || !Number.isFinite(priceNum) || priceNum <= 0) {
    return res.status(400).json({ message: "Price must be greater than 0." });
  }

  const stockNum = typeof stock === "string" ? Number(stock.trim() || NaN) : Number(stock);
  if (stock == null || !Number.isInteger(stockNum) || stockNum < 0) {
    return res
      .status(400)
      .json({ message: "Stock must be a non-negative integer." });
  }

  if (
    category_id != null &&
    category_id !== "" &&
    category_id !== "null" &&
    (!Number.isInteger(Number(category_id)) || Number(category_id) <= 0)
  ) {
    return res.status(400).json({ message: "Category is invalid." });
  }

  // Image is optional: uploaded via req.file (multer) when provided.
  next();
}

module.exports = { validateProduct };
