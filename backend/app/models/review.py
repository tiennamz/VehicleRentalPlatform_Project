from sqlalchemy import Column, BigInteger, Integer, DateTime, String, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class Review(Base):
    __tablename__ = "reviews"
    review_id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"),unique=True)
    reviewer_id = Column(BigInteger, ForeignKey("users.user_id"))
    rating = Column(Integer)
    comment = Column(String(255))
    created_at = Column(DateTime)

    order = relationship("Order", back_populates="review")
    reviewer = relationship("User", back_populates="reviews")
    images = relationship("Image", back_populates="review")