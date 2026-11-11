from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from app.database.database import Base
from sqlalchemy.orm import relationship

class Image(Base):
    __tablename__ = "images"
    image_id = Column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id = Column(BigInteger, ForeignKey("vehicles.vehicle_id"))
    handover_id = Column(BigInteger,ForeignKey("handover_records.handover_id"))
    review_id = Column(BigInteger, ForeignKey("reviews.review_id"))
    complaint_id = Column(BigInteger, ForeignKey("complaints.complaint_id"))
    img_url = Column(Text)
    img_type = Column(String(255))
    upload_at = Column(DateTime)

    vehicle = relationship("Vehicle", back_populates="images")
    handover_record = relationship("HandoverRecord",back_populates="images")
    review = relationship("Review", back_populates="images")
    complaint = relationship("Complaint", back_populates="images")