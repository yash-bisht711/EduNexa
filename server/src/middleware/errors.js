export function notFound(req, res) {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.path}` });
}
export function errors(err, req, res, next) {
  console.error(err);
  if (err.code === 11000)
    return res
      .status(409)
      .json({ message: "A record with this value already exists" });
  if (err.name === "ValidationError")
    return res.status(400).json({ message: err.message });
  if (err.name === "CastError")
    return res.status(400).json({ message: "Invalid identifier" });
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal server error" });
}
