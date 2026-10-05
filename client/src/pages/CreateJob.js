import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, addJobImage } from "../api/jobApi";
import { useAuth } from "../context/AuthContext";
import ImageUpload from "../components/ImageUpload";

const CreateJob = () => {
  const [title, setTitle] = useState("");

  const [fullDescription, setFullDescription] = useState("");
  const [address, setAddress] = useState("");
  const [generalLocation, setGeneralLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [providesResources, setProvidesResources] = useState(true);
  const [requiredResources, setRequiredResources] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleImagesChange = (newImages) => {
    setImages(newImages);
  };

  const uploadJobImages = async (jobId) => {
    const uploadPromises = images.map(async (image) => {
      try {
        return await addJobImage(jobId, {
          url: image.url,
          isPublic: image.isPublic,
          caption: image.caption || null,
        });
      } catch (error) {
        console.error(`Failed to upload image ${image.name}:`, error);
        // Don't throw here - we want the job to be created even if some images fail
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const failedUploads = results.filter((result) => result === null).length;
    const successfulUploads = results.filter(
      (result) => result !== null
    ).length;

    if (failedUploads > 0) {
      console.warn(`${failedUploads} image(s) failed to upload`);
      if (successfulUploads > 0) {
        return {
          success: true,
          message: `Job created successfully! ${successfulUploads} image(s) uploaded, ${failedUploads} failed.`,
          partial: true,
        };
      } else {
        return {
          success: false,
          message:
            "Job created but all images failed to upload. Please try re-uploading images later.",
          partial: true,
        };
      }
    }

    return {
      success: true,
      message: `Job created successfully with ${successfulUploads} image(s)!`,
      partial: false,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to post a job.");
      return;
    }

    if (Number(price) < 25) {
      setError("Minimum job price is $25.00");
      return;
    }

    if (!providesResources && !requiredResources.trim()) {
      setError("Please list the resources the worker will need to bring.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const jobData = {
      title,
      initialDescription: fullDescription, // Use full description for both fields
      fullDescription,
      address,
      generalLocation,
      city,
      state,
      price: Number(price),
      estimatedTime: (Number(hours || 0) * 60) + Number(minutes || 0),
      providesResources,
      requiredResources: providesResources ? null : requiredResources.trim(),
      hirerId: user.id,
    };

    try {
      // Step 1: Create the job
      const createdJob = await createJob(jobData);

      // Step 2: Upload images if any
      if (images.length > 0) {
        try {
          const uploadResult = await uploadJobImages(createdJob.id);

          if (uploadResult.success) {
            // Show success message
            console.log(uploadResult.message);

            // Navigate to the created job detail page to show the images
            navigate(`/jobs/${createdJob.id}`);
          } else {
            // Partial failure - job created but images failed
            setError(uploadResult.message);
            // Still navigate after a delay to show the job was created
            setTimeout(() => {
              navigate(`/jobs/${createdJob.id}`);
            }, 2000);
          }
        } catch (imageError) {
          console.error("Image upload failed:", imageError);
          setError(
            "Job created successfully, but image upload failed. You can add images later from the job details page."
          );
          // Still navigate after showing the error
          setTimeout(() => {
            navigate(`/jobs/${createdJob.id}`);
          }, 2000);
        }
      } else {
        // No images to upload, navigate immediately
        navigate(`/jobs/${createdJob.id}`);
      }
    } catch (err) {
      setError("Failed to create job.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen bg-slate-950">
      <div className="card">
        <div className="card-header">
          <h2 className="text-3xl font-bold text-white">Create a New Job</h2>
          <p className="text-slate-400 mt-2">
            Fill in the details below to post your job listing
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Job Title *
            </label>
            <input
              id="title"
              type="text"
              placeholder="e.g., House Cleaning, Lawn Mowing, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
            />
          </div>

          <div>
            <label
              htmlFor="fullDescription"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Job Description *
            </label>
            <textarea
              id="fullDescription"
              rows={6}
              placeholder="Provide detailed information about the job, requirements, timeline, and any special instructions..."
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500 resize-vertical"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Street Address * (Keep private until accepted)
              </label>
              <input
                id="address"
                type="text"
                placeholder="e.g. 123 Main St"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                City *
              </label>
              <input
                id="city"
                type="text"
                placeholder="e.g. Troy"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                State *
              </label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
              >
                <option value="" disabled className="text-slate-500">Select state</option>
                {["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="generalLocation"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                General Location (Visible to everyone)
              </label>
              <input
                id="generalLocation"
                type="text"
                placeholder="e.g. Near Livernois and Wattles"
                value={generalLocation}
                onChange={(e) => setGeneralLocation(e.target.value)}
                className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
              />
              <p className="text-xs text-slate-500 mt-1">This helps workers know the area before applying.</p>
            </div>
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Job Price (Amount to Pay) *
            </label>
            <input
              id="price"
              type="number"
              min="1"
              placeholder="Enter the amount you will pay"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="hours"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Estimated Time (Hours)
              </label>
              <input
                id="hours"
                type="number"
                min="0"
                placeholder="e.g. 2"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
              />
            </div>
            <div>
              <label
                htmlFor="minutes"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Estimated Time (Minutes)
              </label>
              <input
                id="minutes"
                type="number"
                min="0"
                max="59"
                placeholder="e.g. 30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500"
              />
            </div>
          </div>

          <fieldset className="border border-slate-700 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-slate-300">
              Will you provide the resources needed for this job? *
            </legend>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <label className="flex items-center text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="providesResources"
                  checked={providesResources}
                  onChange={() => setProvidesResources(true)}
                  className="mr-2"
                />
                Yes, I will provide them
              </label>
              <label className="flex items-center text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="providesResources"
                  checked={!providesResources}
                  onChange={() => setProvidesResources(false)}
                  className="mr-2"
                />
                No, the worker needs to bring them
              </label>
            </div>

            {!providesResources && (
              <div className="mt-4">
                <label htmlFor="requiredResources" className="block text-sm font-medium text-slate-300 mb-2">
                  Resources the worker needs to bring *
                </label>
                <textarea
                  id="requiredResources"
                  rows={3}
                  value={requiredResources}
                  onChange={(e) => setRequiredResources(e.target.value)}
                  placeholder="e.g., ladder, paintbrushes, gloves, lawn mower"
                  required
                  className="w-full px-4 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-500 focus:border-wurkzi-500 resize-vertical"
                />
              </div>
            )}
          </fieldset>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Job Images (Optional)
            </label>
            <p className="text-sm text-slate-500 mb-4">
              Add photos to help workers understand the job better. You can
              upload up to 30 images.
            </p>
            <ImageUpload
              onImagesChange={handleImagesChange}
              maxImages={30}
              className="border border-slate-700 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-700">
            <div className="text-sm text-slate-400">
              <span className="text-red-500">*</span> Required fields
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 mr-2"
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
                    Creating...
                  </>
                ) : (
                  "Post Job"
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="upload-error">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateJob;
