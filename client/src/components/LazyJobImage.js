import React, { useState, useEffect } from "react";
import { getJobImages } from "../api/jobApi";
import StatusBadge from "./StatusBadge";

const LazyJobImage = ({ job }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasImages, setHasImages] = useState(false);

    useEffect(() => {
        // If the job list metadata says there are no images, don't bother fetching
        if (!job.jobImages || job.jobImages.length === 0) {
            setLoading(false);
            setHasImages(false);
            return;
        }

        setHasImages(true);
        let isMounted = true;

        const fetchImage = async () => {
            try {
                // Fetch images specifically for this job
                const images = await getJobImages(job.id);

                if (isMounted) {
                    const publicImg = images.find((img) => img.isPublic) || images[0];
                    if (publicImg) {
                        setImageUrl(publicImg.url);
                    } else {
                        setHasImages(false);
                    }
                }
            } catch (error) {
                console.error(`Failed to load image for job ${job.id}`, error);
                if (isMounted) setHasImages(false);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
        };
    }, [job.id, job.jobImages]);

    // Loading Skeleton
    if (loading) {
        return (
            <div className="h-48 bg-slate-800 animate-pulse flex items-center justify-center">
                <svg
                    className="w-10 h-10 text-slate-700 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
            </div>
        );
    }

    // Success State: Show Image
    if (imageUrl) {
        return (
            <div className="relative h-48 bg-slate-800 group-hover:scale-105 transition-transform duration-500">
                <img
                    src={imageUrl}
                    alt={job.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-3 right-3">
                    <StatusBadge status={job.status} type="job" />
                </div>
            </div>
        );
    }

    // Fallback: No Image
    return (
        <div className="h-48 bg-slate-800 flex items-center justify-center relative">
            <div className="text-center">
                <svg
                    className="w-12 h-12 text-slate-700 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 6V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2z"
                    />
                </svg>
                <p className="text-sm text-slate-500">No images</p>
            </div>
            <div className="absolute top-3 right-3">
                <StatusBadge status={job.status} type="job" />
            </div>
        </div>
    );
};

export default LazyJobImage;
